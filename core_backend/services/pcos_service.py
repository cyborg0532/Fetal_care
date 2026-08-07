from sqlalchemy.orm import Session
from core_backend import models, schemas

class PCOSService:
    @staticmethod
    def create_assessment(db: Session, user_id: int, assessment_in: schemas.PCOSAssessmentCreate) -> models.PCOSAssessment:
        # Calculate BMI: weight / (height / 100)**2
        bmi = round(assessment_in.weight / ((assessment_in.height / 100) ** 2), 2)
        
        # Run Medical Rule Engine
        from core_backend.services.rule_engine_service import PCOSRuleEngineService
        rule_res = PCOSRuleEngineService.evaluate_assessment(assessment_in.dict())
        
        # Run ML Predictor
        from core_backend.ml.predictor import PCOSMLPredictor
        ml_res = PCOSMLPredictor.predict(assessment_in.dict())
        
        # Run Hybrid Fusion Engine
        from core_backend.fusion.fusion_engine import HybridFusionEngine
        fused = HybridFusionEngine.fuse(rule_res, ml_res)
        
        # Run Phase 5 Recommendation and Explanation Engine
        from core_backend.services.recommendation_service import PCOSRecommendationService
        from core_backend.services.explanation_service import PCOSExplanationService
        
        assessment_dict = assessment_in.dict()
        recs = PCOSRecommendationService.generate_recommendations(assessment_dict, ml_res)
        explanation = PCOSExplanationService.generate_explanation(
            assessment_dict,
            rule_res,
            ml_res,
            fused["overall_score"],
            fused["risk_level"]
        )
        
        db_assessment = models.PCOSAssessment(
            user_id=user_id,
            status=assessment_in.status,
            rule_score=fused["rule_score"],
            risk_percentage=fused["overall_score"],  # Combined final score
            risk_level=fused["risk_level"],
            reasons=fused["reasons"],
            
            # Hybrid AI additions
            ml_probability=fused["ml_probability"],
            fusion_score=fused["overall_score"],
            confidence=fused["confidence"],
            model_version=fused["model_version"],
            prediction_source=fused["prediction_source"],
            
            # Phase 5 Recommendations and Explanations
            explanation=explanation,
            diet_recommendations=recs["diet"],
            exercise_recommendations=recs["exercise"],
            lifestyle_recommendations=recs["lifestyle"],
            reminders=recs["reminders"],
            
            # Personal Information
            age=assessment_in.age,
            height=assessment_in.height,
            weight=assessment_in.weight,
            bmi=bmi,
            trying_to_conceive=assessment_in.trying_to_conceive,
            pregnant=assessment_in.pregnant,
            
            # Menstrual History
            age_at_first_period=assessment_in.age_at_first_period,
            cycle_length=assessment_in.cycle_length,
            regular_periods=assessment_in.regular_periods,
            missed_periods=assessment_in.missed_periods,
            heavy_bleeding=assessment_in.heavy_bleeding,
            painful_periods=assessment_in.painful_periods,
            
            # Symptoms
            symptom_acne=assessment_in.symptom_acne,
            symptom_excess_facial_hair=assessment_in.symptom_excess_facial_hair,
            symptom_hair_loss=assessment_in.symptom_hair_loss,
            symptom_weight_gain=assessment_in.symptom_weight_gain,
            symptom_difficulty_losing_weight=assessment_in.symptom_difficulty_losing_weight,
            symptom_difficulty_conceiving=assessment_in.symptom_difficulty_conceiving,
            symptom_dark_skin_patches=assessment_in.symptom_dark_skin_patches,
            symptom_fatigue=assessment_in.symptom_fatigue,
            symptom_mood_swings=assessment_in.symptom_mood_swings,
            symptom_sleep_problems=assessment_in.symptom_sleep_problems,
            symptom_irregular_periods=assessment_in.symptom_irregular_periods,
            symptom_pelvic_pain=assessment_in.symptom_pelvic_pain,
            symptom_bloating=assessment_in.symptom_bloating,
            symptom_sugar_cravings=assessment_in.symptom_sugar_cravings,
            
            # Lifestyle
            sleep_duration=assessment_in.sleep_duration,
            stress_level=assessment_in.stress_level,
            exercise_frequency=assessment_in.exercise_frequency,
            diet_quality=assessment_in.diet_quality,
            water_intake=assessment_in.water_intake,
            smoking=assessment_in.smoking,
            alcohol=assessment_in.alcohol,
            fast_food_frequency=assessment_in.fast_food_frequency,
            processed_food_frequency=assessment_in.processed_food_frequency,
            sugar_intake=assessment_in.sugar_intake,
            
            # Quick Medical History (Optional)
            diagnosed_pcos=assessment_in.diagnosed_pcos,
            family_history_pcos=assessment_in.family_history_pcos,
            diabetes_prediabetes=assessment_in.diabetes_prediabetes,
            thyroid_disorder=assessment_in.thyroid_disorder,
            hormonal_medication=assessment_in.hormonal_medication,
            trying_longer_12_months=assessment_in.trying_longer_12_months,
            
            # Lab Values (Optional)
            lab_tsh=assessment_in.lab_tsh,
            lab_total_testosterone=assessment_in.lab_total_testosterone,
            lab_lh=assessment_in.lab_lh,
            lab_fsh=assessment_in.lab_fsh,
            lab_hba1c=assessment_in.lab_hba1c,
            lab_fasting_blood_glucose=assessment_in.lab_fasting_blood_glucose,
            lab_hdl=assessment_in.lab_hdl,
            lab_ldl=assessment_in.lab_ldl,
            lab_triglycerides=assessment_in.lab_triglycerides,
            lab_total_cholesterol=assessment_in.lab_total_cholesterol,
            
            # Ultrasound
            ultrasound_report_url=assessment_in.ultrasound_report_url
        )
        db.add(db_assessment)
        db.commit()
        db.refresh(db_assessment)
        return db_assessment

    @staticmethod
    def get_user_history(db: Session, user_id: int):
        return db.query(models.PCOSAssessment).filter(
            models.PCOSAssessment.user_id == user_id
        ).order_by(models.PCOSAssessment.created_at.desc()).all()

    @staticmethod
    def get_latest_assessment(db: Session, user_id: int):
        return db.query(models.PCOSAssessment).filter(
            models.PCOSAssessment.user_id == user_id
        ).order_by(models.PCOSAssessment.created_at.desc()).first()
