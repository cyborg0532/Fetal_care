# pcos_rules.py — Configurable scoring rules and thresholds for PCOS assessment
from typing import Dict, Any, List, Optional

# Configuration driven scoring dictionary
PCOS_RULES_CONFIG = {
    # Expected maximum raw score threshold to map to 100% risk percentage
    "MAX_EXPECTED_SCORE": 35,
    
    # Risk percentage thresholds mapping to categorical levels
    "RISK_LEVEL_MAPPING": [
        {"max_pct": 20, "level": "Low"},
        {"max_pct": 40, "level": "Moderate"},
        {"max_pct": 70, "level": "High"},
        {"max_pct": 100, "level": "Very High"}
    ],
    
    # ── 1. BMI scoring config
    "bmi": {
        "overweight_threshold": 25.0,
        "obese_threshold": 30.0,
        "overweight_points": 1,
        "obese_points": 2,
    },
    
    # ── 2. Menstrual history rules
    "menstrual": {
        "irregular_periods_points": 3,
        "missed_periods_points": 2,
        "cycle_length_long_threshold": 35,
        "cycle_length_long_points": 2,
        "periods_per_year_low_threshold": 45,  # cycle length > 45 indicates < 8 periods/yr
        "periods_per_year_low_points": 3,
        "painful_periods_points": 1,
    },
    
    # ── 3. Symptoms config
    "symptoms": {
        "symptom_acne": 1,
        "symptom_excess_facial_hair": 2,
        "symptom_hair_loss": 2,
        "symptom_difficulty_losing_weight": 2,
        "symptom_weight_gain": 1,
        "symptom_dark_skin_patches": 3,
        "symptom_difficulty_conceiving": 3,
        "symptom_fatigue": 1,
        "symptom_mood_swings": 1,
        "symptom_pelvic_pain": 1,
        "symptom_sugar_cravings": 1,
    },
    
    # ── 4. Lifestyle rules
    "lifestyle": {
        "sleep_short_threshold": 6.0,
        "sleep_short_points": 1,
        "stress_level_high_points": 1,
        "exercise_never_points": 2,
        "diet_poor_points": 2,
        "fast_food_frequent_points": 1,
        "processed_food_frequent_points": 1,
        "sugar_intake_high_points": 1,
        "smoking_yes_points": 1,
    },
    
    # ── 5. Quick Medical History rules
    "medical_history": {
        "diagnosed_pcos_points": 4,
        "family_history_pcos_points": 3,
        "diabetes_prediabetes_points": 2,
        "thyroid_disorder_points": 2,
        "hormonal_medication_points": 1,
        "trying_longer_12_months_points": 3,
    },
    
    # ── 6. Lab values reference thresholds
    "labs": {
        "tsh_normal_min": 0.45,
        "tsh_normal_max": 4.5,
        "tsh_abnormal_points": 2,
        
        "testosterone_high_threshold": 50.0,  # ng/dL for females
        "testosterone_high_points": 4,
        
        "lh_high_threshold": 12.0,            # mIU/mL
        "lh_high_points": 2,
        
        "lh_fsh_ratio_threshold": 2.0,
        "lh_fsh_ratio_points": 3,
        
        "hba1c_prediabetes_min": 5.7,
        "hba1c_prediabetes_max": 6.4,
        "hba1c_prediabetes_points": 2,
        "hba1c_diabetes_min": 6.5,
        "hba1c_diabetes_points": 3,
        
        "glucose_fasting_elevated_threshold": 100.0,  # mg/dL
        "glucose_fasting_elevated_points": 2,
        
        "hdl_low_threshold": 50.0,            # mg/dL for females
        "hdl_low_points": 1,
        
        "triglycerides_high_threshold": 150.0, # mg/dL
        "triglycerides_high_points": 1,
    },
    # ── 7. Hybrid AI Fusion configuration
    "fusion": {
        "rule_weight": 0.40,
        "ml_weight": 0.60,
        "model_path": "core_backend/ml/pcos_model.pkl",
        "model_version": "v1"
    },
    # ── 8. Phase 5 Recommendation Engine Rules
    "recommendations": {
        "diet": {
            "high_bmi": [
                "Prioritize high-fiber complex carbohydrates (whole oats, quinoa, brown rice) to improve insulin sensitivity.",
                "Include lean proteins with every meal (chicken breast, fish, tofu, lentils) to stabilize blood glucose.",
                "Incorporate healthy fats (avocados, olive oil, walnuts, almonds) to support hormone production."
            ],
            "general": [
                "Maintain adequate hydration by drinking 2.5 to 3 liters of water daily.",
                "Focus on low Glycemic Index (GI) foods like leafy greens, broccoli, berries, and legumes.",
                "Significantly reduce added sugars, sweetened drinks, and ultra-processed convenience foods."
            ],
            "breakfast": [
                {"name": "Spinach & Mushroom Omelette", "desc": "2 eggs whisked with fresh baby spinach, sliced mushrooms, and a side of half an avocado.", "gi": "Low"},
                {"name": "Berry Protein Oatmeal", "desc": "Rolled oats cooked in water, topped with mixed fresh berries, chia seeds, and a scoop of plant-based protein powder.", "gi": "Low-Medium"}
            ],
            "lunch": [
                {"name": "Grilled Chicken Quinoa Salad", "desc": "Grilled chicken breast over a bed of mixed greens, quinoa, cucumber, cherry tomatoes, and a light olive oil dressing.", "gi": "Low"},
                {"name": "Mediterranean Salmon Wrap", "desc": "Baked salmon, hummus, cucumber, and spinach wrapped in a whole grain or spinach tortilla.", "gi": "Low-Medium"}
            ],
            "dinner": [
                {"name": "Lemon Tofu Stir-Fry", "desc": "Firm pan-seared tofu tossed with broccoli, bell peppers, snap peas, and zucchini in a ginger-soy dressing over cauliflower rice.", "gi": "Low"},
                {"name": "Baked Seabass with Roasted Asparagus", "desc": "Seabass fillet baked with lemon herbs, served with roasted asparagus spears and half a roasted sweet potato.", "gi": "Low-Medium"}
            ],
            "snacks": [
                "A handful of raw almonds and walnuts",
                "Celery sticks with all-natural peanut butter",
                "Greek yogurt topped with a sprinkle of ground flaxseeds"
            ]
        },
        "exercise": {
            "overweight": {
                "exercises": ["Walking (30 mins daily)", "Low Impact Cardio", "Yoga or Stretching", "Swimming"],
                "frequency": "4-5 times per week",
                "duration": "30-45 minutes",
                "intensity": "Moderate",
                "rest_days": "2 days per week"
            },
            "normal": {
                "exercises": ["Brisk Walking", "Strength Training", "Cycling", "Stretching Exercises"],
                "frequency": "3-4 times per week",
                "duration": "45-60 minutes",
                "intensity": "Moderate to High",
                "rest_days": "3 days per week"
            }
        },
        "lifestyle": {
            "stress_management": [
                "Practice mindfulness or deep breathing exercises (5-10 minutes twice daily) to lower cortisol.",
                "Prioritize 7-8 hours of uninterrupted sleep every night. Maintain a consistent wake/sleep schedule.",
                "Limit screen time and blue light exposure at least 1 hour before bed to support melatonin production."
            ]
        },
        "follow_ups": {
            "default_repeat_days": 90,
            "repeat_lab_days": 180,
            "gynecologist_visit_days": 90
        }
    }
}


def calculate_bmi(weight_kg: float, height_cm: float) -> Optional[float]:
    if height_cm <= 0:
        return None
    return round(weight_kg / ((height_cm / 100) ** 2), 2)


def calculate_lh_fsh_ratio(lh: Optional[float], fsh: Optional[float]) -> Optional[float]:
    if lh is None or fsh is None or fsh == 0:
        return None
    return round(lh / fsh, 2)


def normalize_lab_values(labs: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """Helper to ensure lab values are converted to float or None."""
    normalized = {}
    for key, value in labs.items():
        if value is None or value == "":
            normalized[key] = None
        else:
            try:
                normalized[key] = float(value)
            except (ValueError, TypeError):
                normalized[key] = None
    return normalized


def calculate_symptom_score(symptoms_data: Dict[str, bool]) -> tuple[int, List[str]]:
    score = 0
    reasons = []
    config = PCOS_RULES_CONFIG["symptoms"]
    
    # Mappings from data key to reason label
    symptom_map = {
        "symptom_acne": "Acne",
        "symptom_excess_facial_hair": "Excess Facial Hair",
        "symptom_hair_loss": "Hair Loss",
        "symptom_difficulty_losing_weight": "Difficulty Losing Weight",
        "symptom_weight_gain": "Weight Gain",
        "symptom_dark_skin_patches": "Dark Skin Patches",
        "symptom_difficulty_conceiving": "Difficulty Conceiving",
        "symptom_fatigue": "Fatigue",
        "symptom_mood_swings": "Mood Swings",
        "symptom_irregular_periods": "Irregular Periods (symptom)",
        "symptom_pelvic_pain": "Pelvic Pain",
        "symptom_bloating": "Bloating",
        "symptom_sugar_cravings": "Sugar Cravings",
    }
    
    for key, pts in config.items():
        if symptoms_data.get(key) is True:
            score += pts
            label = symptom_map.get(key, key.replace("symptom_", "").title())
            reasons.append(f"+{pts} {label}")
            
    return score, reasons


def calculate_lifestyle_score(lifestyle_data: Dict[str, Any]) -> tuple[int, List[str]]:
    score = 0
    reasons = []
    config = PCOS_RULES_CONFIG["lifestyle"]
    
    # Sleep duration
    sleep = lifestyle_data.get("sleep_duration")
    if sleep is not None:
        try:
            sleep_hours = float(sleep)
            if sleep_hours < config["sleep_short_threshold"]:
                pts = config["sleep_short_points"]
                score += pts
                reasons.append(f"+{pts} Sleep <6 hours")
        except (ValueError, TypeError):
            pass
            
    # Stress
    if lifestyle_data.get("stress_level") == "high":
        pts = config["stress_level_high_points"]
        score += pts
        reasons.append(f"+{pts} High Stress")
        
    # Exercise
    if lifestyle_data.get("exercise_frequency") == "never":
        pts = config["exercise_never_points"]
        score += pts
        reasons.append(f"+{pts} No Exercise")
        
    # Diet
    if lifestyle_data.get("diet_quality") == "poor":
        pts = config["diet_poor_points"]
        score += pts
        reasons.append(f"+{pts} Poor Diet")
        
    # Fast food
    if lifestyle_data.get("fast_food_frequency") == "frequent":
        pts = config["fast_food_frequent_points"]
        score += pts
        reasons.append(f"+{pts} Frequent Fast Food")
        
    # Processed food
    if lifestyle_data.get("processed_food_frequency") == "frequent":
        pts = config["processed_food_frequent_points"]
        score += pts
        reasons.append(f"+{pts} Frequent Processed Food")
        
    # Sugar intake
    if lifestyle_data.get("sugar_intake") == "high":
        pts = config["sugar_intake_high_points"]
        score += pts
        reasons.append(f"+{pts} High Sugar Intake")
        
    # Smoking
    if lifestyle_data.get("smoking") == "yes":
        pts = config["smoking_yes_points"]
        score += pts
        reasons.append(f"+{pts} Smoking")
        
    return score, reasons


def calculate_medical_score(medical_data: Dict[str, Any]) -> tuple[int, List[str]]:
    score = 0
    reasons = []
    config = PCOS_RULES_CONFIG["medical_history"]
    
    if medical_data.get("diagnosed_pcos") is True:
        pts = config["diagnosed_pcos_points"]
        score += pts
        reasons.append(f"+{pts} Previous PCOS Diagnosis")
        
    if medical_data.get("family_history_pcos") is True:
        pts = config["family_history_pcos_points"]
        score += pts
        reasons.append(f"+{pts} Family History of PCOS")
        
    if medical_data.get("diabetes_prediabetes") is True:
        pts = config["diabetes_prediabetes_points"]
        score += pts
        reasons.append(f"+{pts} Diabetes/Prediabetes")
        
    if medical_data.get("thyroid_disorder") is True:
        pts = config["thyroid_disorder_points"]
        score += pts
        reasons.append(f"+{pts} Thyroid Disorder")
        
    if medical_data.get("hormonal_medication") is True:
        pts = config["hormonal_medication_points"]
        score += pts
        reasons.append(f"+{pts} Hormonal Medication")
        
    if medical_data.get("trying_longer_12_months") is True:
        pts = config["trying_longer_12_months_points"]
        score += pts
        reasons.append(f"+{pts} Trying to Conceive >12 Months")
        
    return score, reasons


def calculate_lab_score(labs_data: Dict[str, Any]) -> tuple[int, List[str]]:
    score = 0
    reasons = []
    config = PCOS_RULES_CONFIG["labs"]
    
    # Normalize lab values
    normalized = normalize_lab_values(labs_data)
    
    # TSH
    tsh = normalized.get("lab_tsh")
    if tsh is not None:
        if tsh < config["tsh_normal_min"] or tsh > config["tsh_normal_max"]:
            pts = config["tsh_abnormal_points"]
            score += pts
            reasons.append(f"+{pts} TSH Outside Normal Range")
            
    # Testosterone
    testo = normalized.get("lab_total_testosterone")
    if testo is not None:
        if testo > config["testosterone_high_threshold"]:
            pts = config["testosterone_high_points"]
            score += pts
            reasons.append(f"+{pts} High Testosterone")
            
    # LH
    lh = normalized.get("lab_lh")
    if lh is not None:
        if lh > config["lh_high_threshold"]:
            pts = config["lh_high_points"]
            score += pts
            reasons.append(f"+{pts} High LH")
            
    # LH/FSH ratio
    fsh = normalized.get("lab_fsh")
    ratio = calculate_lh_fsh_ratio(lh, fsh)
    if ratio is not None:
        if ratio > config["lh_fsh_ratio_threshold"]:
            pts = config["lh_fsh_ratio_points"]
            score += pts
            reasons.append(f"+{pts} LH/FSH Ratio >2")
            
    # HbA1c
    hba1c = normalized.get("lab_hba1c")
    if hba1c is not None:
        if hba1c >= config["hba1c_diabetes_min"]:
            pts = config["hba1c_diabetes_points"]
            score += pts
            reasons.append(f"+{pts} HbA1c Diabetes Range")
        elif hba1c >= config["hba1c_prediabetes_min"]:
            pts = config["hba1c_prediabetes_points"]
            score += pts
            reasons.append(f"+{pts} HbA1c Prediabetes Range")
            
    # Fasting glucose
    glucose = normalized.get("lab_fasting_blood_glucose")
    if glucose is not None:
        if glucose > config["glucose_fasting_elevated_threshold"]:
            pts = config["glucose_fasting_elevated_points"]
            score += pts
            reasons.append(f"+{pts} Fasting Glucose Elevated")
            
    # HDL
    hdl = normalized.get("lab_hdl")
    if hdl is not None:
        if hdl < config["hdl_low_threshold"]:
            pts = config["hdl_low_points"]
            score += pts
            reasons.append(f"+{pts} HDL Low")
            
    # Triglycerides
    trig = normalized.get("lab_triglycerides")
    if trig is not None:
        if trig > config["triglycerides_high_threshold"]:
            pts = config["triglycerides_high_points"]
            score += pts
            reasons.append(f"+{pts} Triglycerides High")
            
    return score, reasons
