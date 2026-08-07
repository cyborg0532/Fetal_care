# preprocessing.py — Converts PCOS survey data into a clean feature vector for scikit-learn
from typing import Dict, Any, List
from core_backend.ml.feature_engineering import (
    calculate_bmi,
    calculate_lh_fsh_ratio,
    calculate_symptom_score,
    calculate_lifestyle_score,
    calculate_medical_score,
    calculate_lab_score
)

def get_val(data: Any, key: str, default: Any = None) -> Any:
    if isinstance(data, dict):
        return data.get(key, default)
    return getattr(data, key, default)

def preprocess_assessment(assessment_data: Any) -> List[float]:
    """
    Constructs a 30-element feature vector from PCOS assessment questionnaire results.
    Handles missing, skipped, or empty entries by inserting clinical standard fallbacks.
    """
    vector = []
    
    # 1. Age (default to 25.0)
    try:
        val = get_val(assessment_data, "age")
        vector.append(float(val) if val is not None else 25.0)
    except (ValueError, TypeError):
        vector.append(25.0)
        
    # 2. BMI (calculate or fallback to 23.4)
    try:
        w = get_val(assessment_data, "weight")
        h = get_val(assessment_data, "height")
        bmi = calculate_bmi(float(w), float(h)) if w and h else None
        vector.append(bmi if bmi is not None else 23.4)
    except (ValueError, TypeError):
        vector.append(23.4)
        
    # 3. Cycle Length (default to 28.0)
    try:
        val = get_val(assessment_data, "cycle_length")
        vector.append(float(val) if val is not None else 28.0)
    except (ValueError, TypeError):
        vector.append(28.0)
        
    # 4. Irregular Periods
    vector.append(1.0 if get_val(assessment_data, "regular_periods") is False else 0.0)
    
    # 5. Missed Periods
    vector.append(1.0 if get_val(assessment_data, "missed_periods") is True else 0.0)
    
    # 6. Acne
    vector.append(1.0 if get_val(assessment_data, "symptom_acne") is True else 0.0)
    
    # 7. Facial Hair
    vector.append(1.0 if get_val(assessment_data, "symptom_excess_facial_hair") is True else 0.0)
    
    # 8. Hair Loss
    vector.append(1.0 if get_val(assessment_data, "symptom_hair_loss") is True else 0.0)
    
    # 9. Dark Skin Patches
    vector.append(1.0 if get_val(assessment_data, "symptom_dark_skin_patches") is True else 0.0)
    
    # 10. Weight Gain
    vector.append(1.0 if get_val(assessment_data, "symptom_weight_gain") is True else 0.0)
    
    # 11. Difficulty Conceiving
    vector.append(1.0 if get_val(assessment_data, "symptom_difficulty_conceiving") is True else 0.0)
    
    # Extract keys for other scoring algorithms
    keys_to_extract = [
        "symptom_acne", "symptom_excess_facial_hair", "symptom_hair_loss",
        "symptom_weight_gain", "symptom_difficulty_losing_weight",
        "symptom_difficulty_conceiving", "symptom_dark_skin_patches",
        "symptom_fatigue", "symptom_mood_swings", "symptom_sleep_problems",
        "symptom_irregular_periods", "symptom_pelvic_pain", "symptom_bloating",
        "symptom_sugar_cravings",
        "sleep_duration", "stress_level", "exercise_frequency", "diet_quality",
        "water_intake", "smoking", "alcohol", "fast_food_frequency",
        "processed_food_frequency", "sugar_intake",
        "diagnosed_pcos", "family_history_pcos", "diabetes_prediabetes",
        "thyroid_disorder", "hormonal_medication", "trying_longer_12_months",
        "lab_tsh", "lab_total_testosterone", "lab_lh", "lab_fsh", "lab_hba1c",
        "lab_fasting_blood_glucose", "lab_hdl", "lab_ldl", "lab_triglycerides",
        "lab_total_cholesterol"
    ]
    extracted_dict = {k: get_val(assessment_data, k) for k in keys_to_extract}

    # 12. Lifestyle Score
    l_score, _ = calculate_lifestyle_score(extracted_dict)
    vector.append(float(l_score))
    
    # 13. Medical History Score
    m_score, _ = calculate_medical_score(extracted_dict)
    vector.append(float(m_score))
    
    # Helper to parse optional lab values
    def parse_lab(val: Any, default_val: float) -> float:
        if val is None or val == "":
            return default_val
        try:
            return float(val)
        except (ValueError, TypeError):
            return default_val

    # 14. TSH
    vector.append(parse_lab(get_val(assessment_data, "lab_tsh"), 2.0))
    # 15. LH
    lh_val = parse_lab(get_val(assessment_data, "lab_lh"), 6.0)
    vector.append(lh_val)
    # 16. FSH
    fsh_val = parse_lab(get_val(assessment_data, "lab_fsh"), 6.0)
    vector.append(fsh_val)
    # 17. LH/FSH Ratio
    ratio = calculate_lh_fsh_ratio(lh_val, fsh_val) or 1.0
    vector.append(ratio)
    # 18. Testosterone
    vector.append(parse_lab(get_val(assessment_data, "lab_total_testosterone"), 25.0))
    # 19. HbA1c
    vector.append(parse_lab(get_val(assessment_data, "lab_hba1c"), 5.4))
    # 20. Fasting Blood Glucose
    vector.append(parse_lab(get_val(assessment_data, "lab_fasting_blood_glucose"), 90.0))
    # 21. HDL
    vector.append(parse_lab(get_val(assessment_data, "lab_hdl"), 55.0))
    # 22. LDL
    vector.append(parse_lab(get_val(assessment_data, "lab_ldl"), 100.0))
    # 23. Triglycerides
    vector.append(parse_lab(get_val(assessment_data, "lab_triglycerides"), 100.0))
    
    # 24. Sleep duration
    vector.append(parse_lab(get_val(assessment_data, "sleep_duration"), 7.5))
    
    # 25. Stress Level
    stress = get_val(assessment_data, "stress_level", "moderate") or "moderate"
    stress_map = {"low": 0.0, "moderate": 1.0, "high": 2.0}
    vector.append(stress_map.get(stress, 1.0))
    
    # 26. Exercise Frequency
    exercise = get_val(assessment_data, "exercise_frequency", "sometimes") or "sometimes"
    exercise_map = {"never": 0.0, "sometimes": 1.0, "regular": 2.0}
    vector.append(exercise_map.get(exercise, 1.0))
    
    # 27. Diet Score
    diet = get_val(assessment_data, "diet_quality", "average") or "average"
    diet_map = {"poor": 0.0, "average": 1.0, "healthy": 2.0}
    vector.append(diet_map.get(diet, 1.0))
    
    # 28. Water Intake
    vector.append(parse_lab(get_val(assessment_data, "water_intake"), 8.0))
    
    # 29. Smoking
    smoking = get_val(assessment_data, "smoking", "no") or "no"
    vector.append(1.0 if smoking == "yes" else 0.0)
    
    # 30. Alcohol
    alcohol = get_val(assessment_data, "alcohol", "no") or "no"
    vector.append(1.0 if alcohol == "yes" else 0.0)
    
    return vector
