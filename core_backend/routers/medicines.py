from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from core_backend.database import get_db
from core_backend import models, schemas
from core_backend.routers.auth import get_current_user

router = APIRouter(prefix="/medicines", tags=["medicines"])

DISCLAIMER = "⚠️ Medications listed here are doctor-prescribed only. Never change dosages without consulting your physician."

@router.get("/", response_model=List[schemas.MedicineResponse])
def list_medicines(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Medicine).filter(
        models.Medicine.user_id == current_user.id,
        models.Medicine.active_status == True
    ).all()

@router.post("/", response_model=schemas.MedicineResponse)
def add_medicine(
    med_in: schemas.MedicineCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    med = models.Medicine(
        user_id=current_user.id,
        **med_in.model_dump()
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med

@router.put("/{med_id}", response_model=schemas.MedicineResponse)
def update_medicine(
    med_id: int,
    med_in: schemas.MedicineCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    med = db.query(models.Medicine).filter(
        models.Medicine.id == med_id,
        models.Medicine.user_id == current_user.id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    for field, value in med_in.model_dump(exclude_unset=True).items():
        setattr(med, field, value)
    db.commit()
    db.refresh(med)
    return med

@router.delete("/{med_id}")
def delete_medicine(
    med_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    med = db.query(models.Medicine).filter(
        models.Medicine.id == med_id,
        models.Medicine.user_id == current_user.id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    med.active_status = False  # Soft delete
    db.commit()
    return {"detail": "Medicine deactivated", "disclaimer": DISCLAIMER}

@router.post("/{med_id}/log", response_model=schemas.MedicineLogResponse)
def log_medicine(
    med_id: int,
    log_in: schemas.MedicineLogCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    med = db.query(models.Medicine).filter(
        models.Medicine.id == med_id,
        models.Medicine.user_id == current_user.id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")

    # Upsert: remove existing log for same date if any
    existing = db.query(models.MedicineLog).filter(
        models.MedicineLog.medicine_id == med_id,
        models.MedicineLog.log_date == log_in.log_date
    ).first()
    if existing:
        existing.status = log_in.status
        db.commit()
        db.refresh(existing)
        return existing

    log = models.MedicineLog(medicine_id=med_id, log_date=log_in.log_date, status=log_in.status)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.get("/{med_id}/logs", response_model=List[schemas.MedicineLogResponse])
def get_medicine_logs(
    med_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    med = db.query(models.Medicine).filter(
        models.Medicine.id == med_id,
        models.Medicine.user_id == current_user.id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return db.query(models.MedicineLog).filter(
        models.MedicineLog.medicine_id == med_id
    ).order_by(models.MedicineLog.log_date.desc()).all()

@router.get("/disclaimer")
def get_disclaimer():
    return {"disclaimer": DISCLAIMER}
