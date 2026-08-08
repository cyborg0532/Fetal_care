from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from core_backend.database import get_db
from core_backend import models, schemas
from core_backend.routers.auth import get_current_user
from core_backend.services.pcos_service import PCOSService
from core_backend.services.rule_engine_service import PCOSRuleEngineService
from core_backend.services.medical_report_service import MedicalReportService

router = APIRouter(prefix="/pcos", tags=["pcos"])


@router.post("/assessment", response_model=schemas.PCOSAssessmentResponse)
def create_pcos_assessment(
    assessment_in: schemas.PCOSAssessmentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return PCOSService.create_assessment(db, current_user.id, assessment_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history", response_model=List[schemas.PCOSAssessmentResponse])
def get_pcos_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return PCOSService.get_user_history(db, current_user.id)

@router.get("/latest", response_model=schemas.PCOSAssessmentResponse)
def get_latest_pcos_assessment(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assessment = PCOSService.get_latest_assessment(db, current_user.id)
    if not assessment:
        raise HTTPException(status_code=404, detail="No assessment found for this user")
    return assessment


@router.post("/rule-assessment", response_model=schemas.PCOSRuleResultResponse)
def run_pcos_rule_assessment(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assessment = PCOSService.get_latest_assessment(db, current_user.id)
    if not assessment:
        raise HTTPException(status_code=404, detail="No assessment found for this user. Please submit a survey first.")
    return PCOSRuleEngineService.evaluate_assessment(assessment)


# ── Report Extraction and OCR Routes (Phase 4) ──────────────────────────────────

@router.post("/report/upload", response_model=schemas.PCOSMedicalReportResponse)
def upload_medical_report(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return MedicalReportService.process_upload(db, current_user.id, file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document upload: {e}")


@router.post("/report/confirm", response_model=schemas.PCOSMedicalReportResponse)
def confirm_medical_report(
    req: schemas.PCOSMedicalReportConfirmRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return MedicalReportService.confirm_report(
            db, 
            current_user.id, 
            req.report_id, 
            req.confirmed_values, 
            req.ultrasound_findings
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm report parameters: {e}")


@router.get("/report/history", response_model=List[schemas.PCOSMedicalReportResponse])
def get_report_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return MedicalReportService.get_history(db, current_user.id)


@router.get("/report/latest", response_model=schemas.PCOSMedicalReportResponse)
def get_latest_report(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = MedicalReportService.get_latest(db, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="No medical reports found.")
    return report


@router.delete("/report/{id}")
def delete_medical_report(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = MedicalReportService.delete_report(db, current_user.id, id)
    if not success:
        raise HTTPException(status_code=404, detail="Medical report not found.")
    return {"status": "success", "message": f"Report ID {id} has been deleted."}


@router.get("/trends")
def get_pcos_trends(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assessments = db.query(models.PCOSAssessment).filter(
        models.PCOSAssessment.user_id == current_user.id
    ).order_by(models.PCOSAssessment.created_at.asc()).all()
    
    return {
        "dates": [a.created_at.strftime("%Y-%m-%d") for a in assessments],
        "risk_scores": [a.risk_percentage if a.risk_percentage is not None else 0 for a in assessments],
        "bmis": [a.bmi if a.bmi is not None else 0 for a in assessments],
        "weights": [a.weight for a in assessments],
        "sleep_durations": [a.sleep_duration if a.sleep_duration is not None else 8.0 for a in assessments]
    }


@router.get("/preferences")
def get_pcos_preferences(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return current_user.pcos_preferences or {
        "email_enabled": True,
        "push_enabled": True,
        "reminder_interval_days": 30
    }


@router.put("/preferences")
def update_pcos_preferences(
    req: schemas.PCOSPreferencesUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.pcos_preferences = req.dict()
    db.add(current_user)
    db.commit()
    return current_user.pcos_preferences

