# rule_engine_service.py — Evaluates medical rules to determine PCOS risk
from typing import Dict, Any, List
from core_backend.rules.pcos_rules import (
    PCOS_RULES_CONFIG,
    calculate_bmi,
    calculate_symptom_score,
    calculate_lifestyle_score,
    calculate_medical_score,
    calculate_lab_score
)

class PCOSRuleEngineService:
    @staticmethod
    def get_val(data: Any, key: str, default: Any = None) -> Any:
        if isinstance(data, dict):
            return data.get(key, default)
        return getattr(data, key, default)

    @classmethod
    def evaluate_assessment(cls, assessment_data: Any) -> Dict[str, Any]:
        score = 0
        reasons = []
        
        # 1. BMI calculation & scoring
        weight = cls.get_val(assessment_data, "weight")
        height = cls.get_val(assessment_data, "height")
        if weight is not None and height is not None:
            try:
                bmi = calculate_bmi(float(weight), float(height))
                if bmi is not None:
                    bmi_config = PCOS_RULES_CONFIG["bmi"]
                    if bmi >= bmi_config["obese_threshold"]:
                        pts = bmi_config["obese_points"]
                        score += pts
                        reasons.append(f"+{pts} BMI >30")
                    elif bmi >= bmi_config["overweight_threshold"]:
                        pts = bmi_config["overweight_points"]
                        score += pts
                        reasons.append(f"+{pts} BMI 25–29.9")
            except (ValueError, TypeError):
                pass

        # 2. Menstrual history
        menstrual_config = PCOS_RULES_CONFIG["menstrual"]
        if cls.get_val(assessment_data, "regular_periods") is False:
            pts = menstrual_config["irregular_periods_points"]
            score += pts
            reasons.append(f"+{pts} Irregular periods")
            
        if cls.get_val(assessment_data, "missed_periods") is True:
            pts = menstrual_config["missed_periods_points"]
            score += pts
            reasons.append(f"+{pts} Missed periods")
            
        cycle_len = cls.get_val(assessment_data, "cycle_length")
        if cycle_len is not None:
            try:
                cycle_len_val = int(cycle_len)
                if cycle_len_val > menstrual_config["periods_per_year_low_threshold"]:
                    pts = menstrual_config["periods_per_year_low_points"]
                    score += pts
                    reasons.append(f"+{pts} Less than 8 periods/year")
                elif cycle_len_val > menstrual_config["cycle_length_long_threshold"]:
                    pts = menstrual_config["cycle_length_long_points"]
                    score += pts
                    reasons.append(f"+{pts} Cycle >35 days")
            except (ValueError, TypeError):
                pass
                
        if cls.get_val(assessment_data, "painful_periods") is True:
            pts = menstrual_config["painful_periods_points"]
            score += pts
            reasons.append(f"+{pts} Painful periods")

        # Prepare helper payload dict for other calculations
        keys_to_extract = [
            # Symptoms
            "symptom_acne", "symptom_excess_facial_hair", "symptom_hair_loss",
            "symptom_weight_gain", "symptom_difficulty_losing_weight",
            "symptom_difficulty_conceiving", "symptom_dark_skin_patches",
            "symptom_fatigue", "symptom_mood_swings", "symptom_sleep_problems",
            "symptom_irregular_periods", "symptom_pelvic_pain", "symptom_bloating",
            "symptom_sugar_cravings",
            # Lifestyle
            "sleep_duration", "stress_level", "exercise_frequency", "diet_quality",
            "water_intake", "smoking", "alcohol", "fast_food_frequency",
            "processed_food_frequency", "sugar_intake",
            # Medical History
            "diagnosed_pcos", "family_history_pcos", "diabetes_prediabetes",
            "thyroid_disorder", "hormonal_medication", "trying_longer_12_months",
            # Labs
            "lab_tsh", "lab_total_testosterone", "lab_lh", "lab_fsh", "lab_hba1c",
            "lab_fasting_blood_glucose", "lab_hdl", "lab_ldl", "lab_triglycerides",
            "lab_total_cholesterol"
        ]
        
        extracted_dict = {key: cls.get_val(assessment_data, key) for key in keys_to_extract}

        # 3. Symptoms
        sym_score, sym_reasons = calculate_symptom_score(extracted_dict)
        score += sym_score
        reasons.extend(sym_reasons)

        # 4. Lifestyle
        life_score, life_reasons = calculate_lifestyle_score(extracted_dict)
        score += life_score
        reasons.extend(life_reasons)

        # 5. Medical History
        med_score, med_reasons = calculate_medical_score(extracted_dict)
        score += med_score
        reasons.extend(med_reasons)

        # 6. Labs
        lab_score, lab_reasons = calculate_lab_score(extracted_dict)
        score += lab_score
        reasons.extend(lab_reasons)

        # Calculate risk percentage
        max_expected = PCOS_RULES_CONFIG["MAX_EXPECTED_SCORE"]
        risk_pct = min(100, max(0, int((score / max_expected) * 100)))
        
        # Categorize risk level
        risk_level = "Low"
        for mapping in PCOS_RULES_CONFIG["RISK_LEVEL_MAPPING"]:
            if risk_pct <= mapping["max_pct"]:
                risk_level = mapping["level"]
                break
                
        return {
            "rule_score": score,
            "risk_percentage": risk_pct,
            "risk_level": risk_level,
            "confidence": "Rule-Based",
            "reasons": reasons
        }
