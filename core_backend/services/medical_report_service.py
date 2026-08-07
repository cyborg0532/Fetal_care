# medical_report_service.py — Orchestrates OCR, parsing, database persistence, and fusion integration
import os
import uuid
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile

from core_backend import models, schemas
from core_backend.services.ocr_service import OCRService
from core_backend.parsers.lab_report_parser import LabReportParser
from core_backend.parsers.ultrasound_parser import UltrasoundParser
from core_backend.validators.lab_validator import LabValidator
from core_backend.services.pcos_service import PCOSService

logger = logging.getLogger("uvicorn.error")

# Configurable max upload size (default: 5 MB)
MAX_FILE_SIZE_MB = 5.0
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

class MedicalReportService:
    @staticmethod
    def process_upload(db: Session, user_id: int, file: UploadFile) -> models.PCOSMedicalReport:
        """
        Validates uploaded file size/extension, saves it uniquely, runs OCR, 
        extracts lab values or ultrasound markers, and returns a draft PCOSMedicalReport.
        """
        # 1. Validate file extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file format '{ext}'. Supported: PDF, PNG, JPG, JPEG.")
            
        # 2. Save file uniquely in uploads folder
        upload_dir = "core_backend/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        unique_name = f"{uuid.uuid4()}{ext}"
        save_path = os.path.join(upload_dir, unique_name)
        
        # Read and check size
        contents = file.file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            raise ValueError(f"File size exceeds the {MAX_FILE_SIZE_MB} MB limit. Size: {round(size_mb, 2)} MB.")
            
        # Write to disk
        file.file.seek(0)
        with open(save_path, "wb") as f:
            f.write(contents)
            
        # 3. Perform OCR
        try:
            raw_text = OCRService.extract_text(save_path, original_filename=file.filename)
        except Exception as e:
            logger.error(f"OCR extraction failure: {e}")
            raw_text = ""
            
        # 4. Parse based on report type
        report_type = "blood_test"
        if "ultrasound" in file.filename.lower() or "pelvic" in file.filename.lower() or "ultrasound" in raw_text.lower():
            report_type = "ultrasound"
            
        extracted_values = {}
        normalized_values = {}
        confidence_scores = {}
        ultrasound_findings = {}
        
        if report_type == "ultrasound":
            ultrasound_findings = UltrasoundParser.parse_text(raw_text)
        else:
            extracted_values, normalized_values, confidence_scores = LabReportParser.parse_text(raw_text)
            
        # Save to database
        db_report = models.PCOSMedicalReport(
            user_id=user_id,
            report_type=report_type,
            file_path=save_path,
            raw_text=raw_text,
            extracted_values=extracted_values,
            normalized_values=normalized_values,
            confidence_scores=confidence_scores,
            ocr_metadata={"provider": "LocalMockOCR", "version": "v1.0"},
            ultrasound_findings=ultrasound_findings,
            is_confirmed=False
        )
        
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        return db_report

    @staticmethod
    def confirm_report(
        db: Session, 
        user_id: int, 
        report_id: int, 
        confirmed_values: Dict[str, Any],
        ultrasound_findings: Optional[Dict[str, Any]] = None
    ) -> models.PCOSMedicalReport:
        """
        Confirms extracted report parameters and syncs them automatically into the user's latest PCOS assessment,
        re-triggering rule score evaluations and ML predictions.
        """
        # 1. Fetch report record
        db_report = db.query(models.PCOSMedicalReport).filter(
            models.PCOSMedicalReport.id == report_id,
            models.PCOSMedicalReport.user_id == user_id
        ).first()
        
        if not db_report:
            raise ValueError(f"Report ID {report_id} not found for this user.")
            
        # 2. Validate confirmed fields against physiological sanity
        errors, validation_status = LabValidator.validate_values(confirmed_values)
        if errors:
            logger.warning(f"Lab validation warnings during confirmation: {errors}")
            
        # Update report status
        db_report.normalized_values = confirmed_values
        if ultrasound_findings:
            db_report.ultrasound_findings = ultrasound_findings
        db_report.is_confirmed = True
        
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        # 3. Synchronize with latest PCOSAssessment
        assessment = PCOSService.get_latest_assessment(db, user_id)
        
        # If no assessment exists, create a skeleton assessment to preserve results
        if not assessment:
            logger.info("No existing assessment found. Generating a skeleton assessment to sync lab report values.")
            skeleton_data = schemas.PCOSAssessmentCreate(
                age=25,
                height=160.0,
                weight=60.0,
                trying_to_conceive=False,
                pregnant=False,
                
                # Menstrual History Defaults
                age_at_first_period=12,
                cycle_length=28,
                regular_periods=True,
                missed_periods=False,
                heavy_bleeding=False,
                painful_periods=False,
                
                # Symptom Defaults
                symptom_acne=False,
                symptom_excess_facial_hair=False,
                symptom_hair_loss=False,
                symptom_weight_gain=False,
                symptom_difficulty_losing_weight=False,
                symptom_difficulty_conceiving=False,
                symptom_dark_skin_patches=False,
                symptom_fatigue=False,
                symptom_mood_swings=False,
                symptom_sleep_problems=False,
                symptom_irregular_periods=False,
                symptom_pelvic_pain=False,
                symptom_bloating=False,
                symptom_sugar_cravings=False,
                
                # Lifestyle Defaults
                sleep_duration=8.0,
                stress_level="low",
                exercise_frequency="sometimes",
                diet_quality="good",
                water_intake=8.0,
                smoking="no",
                alcohol="no",
                fast_food_frequency="never",
                processed_food_frequency="never",
                sugar_intake="low",
                
                status="completed",
                # Pass confirmed lab values
                lab_tsh=confirmed_values.get("lab_tsh"),
                lab_total_testosterone=confirmed_values.get("lab_total_testosterone"),
                lab_lh=confirmed_values.get("lab_lh"),
                lab_fsh=confirmed_values.get("lab_fsh"),
                lab_hba1c=confirmed_values.get("lab_hba1c"),
                lab_fasting_blood_glucose=confirmed_values.get("lab_fasting_blood_glucose"),
                lab_hdl=confirmed_values.get("lab_hdl"),
                lab_ldl=confirmed_values.get("lab_ldl"),
                lab_triglycerides=confirmed_values.get("lab_triglycerides"),
                lab_total_cholesterol=confirmed_values.get("lab_total_cholesterol"),
                ultrasound_report_url=db_report.file_path if db_report.report_type == "ultrasound" else None
            )
            # This triggers rule calculations and ML/Fusion engine automatically!
            PCOSService.create_assessment(db, user_id, skeleton_data)
        else:
            logger.info(f"Syncing extracted values to existing assessment (ID: {assessment.id}).")
            # Update matching lab variables in latest assessment
            for key, val in confirmed_values.items():
                if hasattr(assessment, key) and val is not None:
                    setattr(assessment, key, val)
                    
            if db_report.report_type == "ultrasound":
                assessment.ultrasound_report_url = db_report.file_path
                
            # Re-evaluate BMI
            bmi = round(assessment.weight / ((assessment.height / 100) ** 2), 2)
            assessment.bmi = bmi
            
            # Recalculate rules, ML, and fusion
            from core_backend.services.rule_engine_service import PCOSRuleEngineService
            from core_backend.ml.predictor import PCOSMLPredictor
            from core_backend.fusion.fusion_engine import HybridFusionEngine
            
            # Turn model instance attributes into a dictionary payload for calculations
            data_dict = {c.name: getattr(assessment, c.name) for c in assessment.__table__.columns}
            
            rule_res = PCOSRuleEngineService.evaluate_assessment(data_dict)
            ml_res = PCOSMLPredictor.predict(data_dict)
            fused = HybridFusionEngine.fuse(rule_res, ml_res)
            
            # Write fused outcomes back to database record
            assessment.rule_score = fused["rule_score"]
            assessment.risk_percentage = fused["overall_score"]
            assessment.risk_level = fused["risk_level"]
            assessment.reasons = fused["reasons"]
            
            assessment.ml_probability = fused["ml_probability"]
            assessment.fusion_score = fused["overall_score"]
            assessment.confidence = fused["confidence"]
            assessment.model_version = fused["model_version"]
            assessment.prediction_source = fused["prediction_source"]
            
            db.add(assessment)
            db.commit()
            
        return db_report

    @staticmethod
    def get_history(db: Session, user_id: int) -> List[models.PCOSMedicalReport]:
        return db.query(models.PCOSMedicalReport).filter(
            models.PCOSMedicalReport.user_id == user_id
        ).order_by(models.PCOSMedicalReport.upload_date.desc()).all()

    @staticmethod
    def get_latest(db: Session, user_id: int) -> Optional[models.PCOSMedicalReport]:
        return db.query(models.PCOSMedicalReport).filter(
            models.PCOSMedicalReport.user_id == user_id
        ).order_by(models.PCOSMedicalReport.upload_date.desc()).first()

    @staticmethod
    def delete_report(db: Session, user_id: int, report_id: int) -> bool:
        db_report = db.query(models.PCOSMedicalReport).filter(
            models.PCOSMedicalReport.id == report_id,
            models.PCOSMedicalReport.user_id == user_id
        ).first()
        if not db_report:
            return False
            
        # Clean up file on disk
        if db_report.file_path and os.path.exists(db_report.file_path):
            try:
                os.remove(db_report.file_path)
            except OSError as e:
                logger.error(f"Failed to delete file from disk: {e}")
                
        db.delete(db_report)
        db.commit()
        return True
