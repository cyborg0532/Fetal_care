from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from core_backend.database import get_db
from core_backend import models, schemas
from core_backend.routers.auth import get_current_user

router = APIRouter(prefix="/appointments", tags=["appointments"])

TRIMESTER_CHECKLIST = {
    1: ["Blood type test", "Urine test", "Complete blood count", "Thyroid function test", "First ultrasound", "Discuss prenatal vitamins"],
    2: ("Anomaly scan (18-20 weeks)", "Glucose challenge test (24-28 weeks)", "Iron level test", "Blood pressure check", "Fundal height measurement"),
    3: ("Group B Strep test (35-37 weeks)", "Non-stress test", "Cervical check", "Hospital bag ready check", "Confirm birth plan"),
}

@router.get("/", response_model=List[schemas.AppointmentResponse])
def list_appointments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Appointment).filter(
        models.Appointment.user_id == current_user.id
    ).order_by(models.Appointment.date_time.asc()).all()

@router.post("/", response_model=schemas.AppointmentResponse)
def create_appointment(
    appt_in: schemas.AppointmentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-populate trimester checklist if none provided
    if not appt_in.checklist_items:
        items = TRIMESTER_CHECKLIST.get(appt_in.trimester, [])
        checklist = [{"item": i, "checked": False} for i in items]
    else:
        checklist = appt_in.checklist_items

    appt = models.Appointment(
        user_id=current_user.id,
        title=appt_in.title,
        doctor_name=appt_in.doctor_name,
        date_time=appt_in.date_time,
        notes=appt_in.notes,
        trimester=appt_in.trimester,
        checklist_items=checklist,
        report_url=appt_in.report_url,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt

@router.get("/{appt_id}", response_model=schemas.AppointmentResponse)
def get_appointment(
    appt_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appt = db.query(models.Appointment).filter(
        models.Appointment.id == appt_id,
        models.Appointment.user_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt

@router.put("/{appt_id}", response_model=schemas.AppointmentResponse)
def update_appointment(
    appt_id: int,
    appt_in: schemas.AppointmentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appt = db.query(models.Appointment).filter(
        models.Appointment.id == appt_id,
        models.Appointment.user_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    for field, value in appt_in.model_dump(exclude_unset=True).items():
        setattr(appt, field, value)
    db.commit()
    db.refresh(appt)
    return appt

@router.delete("/{appt_id}")
def delete_appointment(
    appt_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appt = db.query(models.Appointment).filter(
        models.Appointment.id == appt_id,
        models.Appointment.user_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
    return {"detail": "Appointment deleted"}

@router.get("/checklist/{trimester}")
def get_trimester_checklist(trimester: int):
    items = TRIMESTER_CHECKLIST.get(trimester, [])
    return {"trimester": trimester, "items": [{"item": i, "checked": False} for i in items]}
