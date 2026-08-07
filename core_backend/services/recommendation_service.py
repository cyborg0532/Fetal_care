# recommendation_service.py — Structured clinical recommendations generated using configurable rules
from typing import Dict, Any, List
import logging
from core_backend.rules.pcos_rules import PCOS_RULES_CONFIG

logger = logging.getLogger("uvicorn.error")

class PCOSRecommendationService:
    @staticmethod
    def generate_recommendations(assessment_data: Dict[str, Any], ml_res: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Evaluates user parameters and ML prediction to return personalized
        diet, exercise, lifestyle, and reminders recommendations.
        """
        rec_config = PCOS_RULES_CONFIG.get("recommendations", {})
        ml_res = ml_res or {}
        # ml_res["probability"] is 0.0 to 1.0, scale to 0-100%
        ml_probability = ml_res.get("probability", 0.0) * 100.0
        
        # 1. Gather variables
        weight = assessment_data.get("weight", 60.0)
        height = assessment_data.get("height", 160.0)
        bmi = round(weight / ((height / 100.0) ** 2), 2)
        
        age = assessment_data.get("age", 25)
        glucose = assessment_data.get("lab_fasting_blood_glucose")
        hba1c = assessment_data.get("lab_hba1c")
        ldl = assessment_data.get("lab_ldl")
        trig = assessment_data.get("lab_triglycerides")
        testo = assessment_data.get("lab_total_testosterone")
        tsh = assessment_data.get("lab_tsh")
        
        diet_quality = assessment_data.get("diet_quality", "average")
        exercise_freq = assessment_data.get("exercise_frequency", "sometimes")
        stress_level = assessment_data.get("stress_level", "moderate")
        
        # 2. Build personalized diet recommendations
        if ml_probability >= 50.0:
            # High risk: Filter meals for strict Low-GI
            breakfast_meals = [m for m in rec_config["diet"]["breakfast"] if m.get("gi") == "Low"]
            lunch_meals = [m for m in rec_config["diet"]["lunch"] if m.get("gi") == "Low"]
            dinner_meals = [m for m in rec_config["diet"]["dinner"] if m.get("gi") == "Low"]
            
            # Fallbacks
            breakfast_meals = breakfast_meals or rec_config["diet"]["breakfast"]
            lunch_meals = lunch_meals or rec_config["diet"]["lunch"]
            dinner_meals = dinner_meals or rec_config["diet"]["dinner"]
        else:
            breakfast_meals = rec_config["diet"]["breakfast"]
            lunch_meals = rec_config["diet"]["lunch"]
            dinner_meals = rec_config["diet"]["dinner"]

        nutrition_tips = list(rec_config["diet"]["general"])
        
        # ML-driven custom dietary guidance
        if ml_probability >= 50.0:
            nutrition_tips.append("⚠️ **High metabolic risk indicated:** Keep carbohydrates below 100g per day and completely avoid refined sugars to prevent sharp insulin spikes.")
            
        # Hormone/TSH personalization
        if testo and testo > 50.0:
            nutrition_tips.append("🌿 **Anti-Androgenic Support:** High testosterone levels detected. Consider drinking 2 cups of spearmint tea daily or incorporating 2 tablespoons of ground flaxseed to help lower free androgens.")
            
        if tsh and tsh > 4.5:
            nutrition_tips.append("🧬 **Thyroid Support:** Elevated TSH levels detected. Focus on mineral-rich foods (brazil nuts for selenium, pumpkin seeds for zinc) to support thyroid hormone conversion.")
            
        if bmi >= 25.0 or diet_quality == "poor":
            nutrition_tips.extend(rec_config["diet"]["high_bmi"])
            
        diet_rec = {
            "meals": {
                "breakfast": breakfast_meals,
                "lunch": lunch_meals,
                "dinner": dinner_meals
            },
            "snacks": rec_config["diet"]["snacks"],
            "nutrition_tips": nutrition_tips,
            "hydration_goal": "Drink 2.5 - 3.0 Liters of water daily."
        }
            
        # 3. Build personalized exercise recommendations
        if ml_probability >= 50.0 and stress_level == "high":
            # Restorative routine to prevent cortisol spike
            suggested = ["Restorative Hatha/Yin Yoga", "Brisk Outdoor Walking (20-30 mins)", "Pilates / Core Stability Workout", "Deep Breathing & Stretches"]
            safety_note = "Restorative Focus: Intense cardio or HIIT can elevate cortisol levels, potentially worsening PCOS symptoms. Listen to your body and prioritize recovery."
            freq = "3-4 times per week"
            duration = "20-30 minutes"
            intensity = "Low to Moderate"
            rest_days = "3 days per week"
        elif ml_probability >= 50.0:
            # Standard high risk routine focusing on building muscle insulin sensitivity
            suggested = ["Full-Body Strength/Resistance Training", "Steady-State Cardio (LISS - 30 mins)", "Functional Bodyweight Exercises", "Cycling or Swimming"]
            safety_note = "Metabolic Focus: Building lean muscle mass significantly improves insulin receptor function and glucose clearance. Ensure proper form."
            freq = "4 times per week"
            duration = "30-45 minutes"
            intensity = "Moderate"
            rest_days = "3 days per week"
        else:
            # Low risk: general active routine
            ex_key = "overweight" if bmi >= 25.0 else "normal"
            ex_cfg = rec_config["exercise"][ex_key]
            suggested = list(ex_cfg["exercises"])
            freq = ex_cfg["frequency"]
            duration = ex_cfg["duration"]
            intensity = ex_cfg["intensity"]
            rest_days = ex_cfg["rest_days"]
            safety_note = "General Fitness Focus: Keep active and consult a physician if you experience any discomfort or dizziness."

        exercise_rec = {
            "suggested_workouts": suggested,
            "frequency": freq,
            "duration": duration,
            "intensity": intensity,
            "rest_days": rest_days,
            "safety_note": safety_note
        }
        
        # 4. Build lifestyle suggestions
        lifestyle_rec = {
            "stress_management": list(rec_config["lifestyle"]["stress_management"]),
            "sleep_goal": "Maintain 7 to 8 hours of deep, restful sleep. Avoid screen exposure 1 hour prior to sleep."
        }
        
        # 5. Build reminders & follow-ups
        reminders_list = [
            f"Schedule repeat PCOS symptom survey in {rec_config['follow_ups']['default_repeat_days']} days.",
            f"Consult a qualified gynecologist or endocrinologist in {rec_config['follow_ups']['gynecologist_visit_days']} days for a professional checkup."
        ]
        
        # Condition-based reminders
        if glucose and glucose > 100.0 or hba1c and hba1c >= 5.7:
            reminders_list.append("Discuss an Oral Glucose Tolerance Test (OGTT) or Fasting Insulin panel with your doctor.")
            
        if ldl and ldl > 130.0 or trig and trig > 150.0:
            reminders_list.append("Re-evaluate lipid cholesterol metrics in 3 to 6 months.")
            
        reminders_rec = {
            "actions": reminders_list,
            "preferences": {
                "email_reminders": True,
                "push_reminders": True
            }
        }
        
        return {
            "diet": diet_rec,
            "exercise": exercise_rec,
            "lifestyle": lifestyle_rec,
            "reminders": reminders_rec,
            "version": "v1.0"
        }
