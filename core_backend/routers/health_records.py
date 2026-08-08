from fastapi import APIRouter, Depends, HTTPException, Response, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import csv
import io

from core_backend.database import get_db
from core_backend.routers.auth import get_current_user
from core_backend import models

router = APIRouter(prefix="/health-records", tags=["health-records"])


class AttachmentPayload(BaseModel):
    attachment_url: str
    attachment_name: Optional[str] = "Evidence_Document"
    attachment_type: Optional[str] = "image"  # image, pdf, document


class HealthRecordCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "General"
    status: Optional[str] = "verified"  # verified, pending, under_review, flagged
    role_visibility: Optional[str] = "user"  # user, hospital, investigator, admin
    patient_name: Optional[str] = "Mama Patient"
    gestational_week: Optional[int] = 24
    risk_level: Optional[str] = "Low Risk"
    doctor_notes: Optional[str] = None
    recommendations: Optional[List[str]] = []
    lab_values: Optional[Dict[str, Any]] = {}
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = None


# Seed sample records if user has none
def seed_sample_records(db: Session, user_id: int):
    sample_records = [
        {
            "user_id": user_id,
            "title": "Trimester 2 Ultrasound Anomaly Scan",
            "description": "Routine 20-week anatomical survey scan showing healthy fetal cardiac activity and clear placental placement.",
            "category": "Ultrasound Scan",
            "status": "verified",
            "role_visibility": "hospital",
            "patient_name": "Divya Sharma",
            "gestational_week": 20,
            "risk_level": "Normal / Low Risk",
            "doctor_notes": "Single active intrauterine fetus in vertex presentation. Amniotic fluid volume is normal (AFI 14.5 cm). No structural anomalies detected.",
            "recommendations": [
                "Continue prenatal multivitamin & folic acid.",
                "Schedule follow-up growth scan at Week 28.",
                "Maintain daily hydration (2.5L)."
            ],
            "lab_values": {
                "Fetal Heart Rate": "142 bpm",
                "Estimated Fetal Weight": "340 g",
                "Amniotic Fluid Index": "14.5 cm",
                "Placental Location": "Anterior"
            },
            "attachment_url": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80",
            "attachment_name": "Ultrasound_20W_Scan.jpg",
            "attachment_type": "image",
        },
        {
            "user_id": user_id,
            "title": "Antenatal Complete Blood Count (CBC) Panel",
            "description": "Routine blood test evaluating hemoglobin, hematocrit, and platelet count.",
            "category": "Blood Test",
            "status": "under_review",
            "role_visibility": "investigator",
            "patient_name": "Divya Sharma",
            "gestational_week": 24,
            "risk_level": "Moderate Risk (Mild Anemia)",
            "doctor_notes": "Hemoglobin level is 10.2 g/dL indicating mild gestational iron-deficiency anemia. Iron supplementation prescribed.",
            "recommendations": [
                "Start Ferrous Sulfate 200mg once daily with Vitamin C.",
                "Increase dark leafy green vegetables in diet.",
                "Re-check CBC in 4 weeks."
            ],
            "lab_values": {
                "Hemoglobin": "10.2 g/dL (Normal: 11.5 - 15.0)",
                "Hematocrit": "31% (Normal: 35 - 45%)",
                "WBC Count": "11,500 /uL",
                "Platelet Count": "210,000 /uL"
            },
            "attachment_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            "attachment_name": "CBC_Blood_Panel_Report.pdf",
            "attachment_type": "pdf",
        },
        {
            "user_id": user_id,
            "title": "Comprehensive PCOS & Metabolic Risk Assessment",
            "description": "AI Hybrid Rule Engine evaluation of insulin resistance, menstrual regularity, and hormonal indicators.",
            "category": "PCOS Assessment",
            "status": "verified",
            "role_visibility": "user",
            "patient_name": "Divya Sharma",
            "gestational_week": 16,
            "risk_level": "Low PCOS Risk",
            "doctor_notes": "Hormonal screening normal. Regular menstrual cycles reported prior to conception. No metabolic distress.",
            "recommendations": [
                "30 mins gentle prenatal walking daily.",
                "Low-glycemic diet with complex carbohydrates."
            ],
            "lab_values": {
                "Fasting Glucose": "88 mg/dL",
                "TSH Level": "1.8 mIU/L",
                "LH/FSH Ratio": "1.1"
            },
            "attachment_url": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80",
            "attachment_name": "PCOS_Metabolic_Summary.png",
            "attachment_type": "image",
        },
        {
            "user_id": user_id,
            "title": "High-Risk Pregnancy Audit Log & Authority Escrow",
            "description": "Institutional compliance log for high-risk monitoring and emergency dispatch preparedness.",
            "category": "Authority Log",
            "status": "flagged",
            "role_visibility": "admin",
            "patient_name": "Divya Sharma",
            "gestational_week": 26,
            "risk_level": "High Priority Audit",
            "doctor_notes": "Automatic system escalation flag created due to voice emergency test trigger. Hospital dispatch standing by.",
            "recommendations": [
                "Verify primary emergency contact phone number.",
                "Confirm nearest NICU facility readiness."
            ],
            "lab_values": {
                "SOS Trigger Status": "Test Completed",
                "Dispatch Ready": "True",
                "Hospital Clearance": "Pending"
            },
            "attachment_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            "attachment_name": "Audit_Escrow_Compliance.pdf",
            "attachment_type": "pdf",
        },
        {
            "user_id": user_id,
            "title": "Prenatal Medication & Vitamin Schedule",
            "description": "Active prescription log for daily prenatal vitamins, iron, and folic acid.",
            "category": "Prescription",
            "status": "verified",
            "role_visibility": "user",
            "patient_name": "Divya Sharma",
            "gestational_week": 24,
            "risk_level": "Low Risk",
            "doctor_notes": "Patient adherent to morning vitamin schedule.",
            "recommendations": [
                "Take iron tablet on an empty stomach with orange juice for max absorption."
            ],
            "lab_values": {
                "Folic Acid": "5 mg daily",
                "Calcium Carbonate": "500 mg twice daily"
            },
            "attachment_url": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&auto=format&fit=crop&q=80",
            "attachment_name": "Prescription_Rx_Scan.jpg",
            "attachment_type": "image",
        },
        {
            "user_id": user_id,
            "title": "Hospital Admission & Emergency Clearance Card",
            "description": "Verified emergency profile card containing blood group, emergency contacts, and preferred hospital.",
            "category": "Clinical Note",
            "status": "pending",
            "role_visibility": "hospital",
            "patient_name": "Divya Sharma",
            "gestational_week": 28,
            "risk_level": "Cleared for Labor ward",
            "doctor_notes": "Pre-registration completed at St. Jude Maternity Center.",
            "recommendations": [
                "Keep physical copy of emergency clearance card in hospital bag."
            ],
            "lab_values": {
                "Blood Type": "O+",
                "Allergies": "Penicillin (Mild)"
            },
            "attachment_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            "attachment_name": "Hospital_PreAdmission_Clearance.pdf",
            "attachment_type": "pdf",
        }
    ]

    for rec in sample_records:
        r = models.HealthRecord(**rec)
        db.add(r)
    db.commit()


@router.get("")
def get_health_records(
    role: str = Query("user", description="Filter records by role: user, hospital, investigator, admin, all"),
    status_filter: Optional[str] = Query(None, description="Optional status filter: verified, pending, under_review, flagged"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if user has any records; if none, pre-seed
    user_records_count = db.query(models.HealthRecord).filter(models.HealthRecord.user_id == current_user.id).count()
    if user_records_count == 0:
        seed_sample_records(db, current_user.id)

    query = db.query(models.HealthRecord).filter(models.HealthRecord.user_id == current_user.id)
    total_count = query.count()

    # Role-aware filtering
    # Roles hierarchy:
    # 'user' -> sees 'user' records
    # 'hospital' -> sees 'user' and 'hospital' records
    # 'investigator' -> sees 'user', 'hospital', and 'investigator' records
    # 'admin' or 'all' -> sees all records
    if role == "user":
        query = query.filter(models.HealthRecord.role_visibility.in_(["user"]))
    elif role == "hospital":
        query = query.filter(models.HealthRecord.role_visibility.in_(["user", "hospital"]))
    elif role == "investigator":
        query = query.filter(models.HealthRecord.role_visibility.in_(["user", "hospital", "investigator"]))
    elif role == "admin" or role == "all":
        pass  # sees all

    if status_filter and status_filter != "all":
        query = query.filter(models.HealthRecord.status == status_filter)

    records = query.order_by(models.HealthRecord.created_at.desc()).all()

    return {
        "records": records,
        "total_count": total_count,
        "visible_count": len(records),
        "active_role": role,
    }


@router.post("")
def create_health_record(
    payload: HealthRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    record = models.HealthRecord(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category or "General",
        status=payload.status or "verified",
        role_visibility=payload.role_visibility or "user",
        patient_name=payload.patient_name or "Mama Patient",
        gestational_week=payload.gestational_week or 24,
        risk_level=payload.risk_level or "Low Risk",
        doctor_notes=payload.doctor_notes,
        recommendations=payload.recommendations,
        lab_values=payload.lab_values,
        attachment_url=payload.attachment_url,
        attachment_name=payload.attachment_name,
        attachment_type=payload.attachment_type,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{record_id}/attachment")
def attach_evidence_to_record(
    record_id: int,
    payload: AttachmentPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    record = db.query(models.HealthRecord).filter(
        models.HealthRecord.id == record_id,
        models.HealthRecord.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Health record not found")

    record.attachment_url = payload.attachment_url
    record.attachment_name = payload.attachment_name or "Supporting_Evidence"
    record.attachment_type = payload.attachment_type or "image"
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}/export")
def export_health_record_report(
    record_id: int,
    export_format: str = Query("html", alias="format", description="Export format: html, csv, pdf"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    record = db.query(models.HealthRecord).filter(
        models.HealthRecord.id == record_id,
        models.HealthRecord.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Health record not found")

    # CSV Export
    if export_format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Field", "Value"])
        writer.writerow(["Record ID", record.id])
        writer.writerow(["Title", record.title])
        writer.writerow(["Category", record.category])
        writer.writerow(["Status", record.status])
        writer.writerow(["Role Visibility", record.role_visibility])
        writer.writerow(["Patient Name", record.patient_name])
        writer.writerow(["Gestational Week", f"Week {record.gestational_week}"])
        writer.writerow(["Risk Level", record.risk_level])
        writer.writerow(["Doctor Notes", record.doctor_notes or "None"])
        writer.writerow(["Recommendations", "; ".join(record.recommendations or [])])
        writer.writerow(["Attachment Name", record.attachment_name or "None"])
        writer.writerow(["Attachment URL", record.attachment_url or "None"])
        writer.writerow(["Created At", record.created_at.strftime("%Y-%m-%d %H:%M:%S") if record.created_at else ""])

        if record.lab_values:
            writer.writerow([])
            writer.writerow(["--- Lab & Clinical Values ---", "---"])
            for k, v in record.lab_values.items():
                writer.writerow([k, str(v)])

        content = output.getvalue()
        return Response(
            content=content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="Health_Record_{record.id}.csv"'
            }
        )

    # HTML / PDF Printable Report Export
    recs_html = "".join([f"<li>{r}</li>" for r in (record.recommendations or [])])
    labs_html = ""
    if record.lab_values:
        labs_rows = "".join([f"<tr><td style='padding:8px;border-bottom:1px solid #eee;font-weight:600;'>{k}</td><td style='padding:8px;border-bottom:1px solid #eee;'>{v}</td></tr>" for k, v in record.lab_values.items()])
        labs_html = f"""
        <div style="margin-top:20px;">
            <h3 style="color:#2b1b4d;margin-bottom:8px;">📊 Lab & Clinical Indicators</h3>
            <table style="width:100%;border-collapse:collapse;background:#f9f8fc;border-radius:8px;overflow:hidden;">
                {labs_rows}
            </table>
        </div>
        """

    evidence_html = ""
    if record.attachment_url:
        if record.attachment_type == "image":
            evidence_html = f"""
            <div style="margin-top:20px;padding:16px;background:#f4f0fa;border-radius:12px;border:1px solid #e2d9f3;">
                <h3 style="color:#d4589a;margin-top:0;">📷 Attached Supporting Evidence (Image/Scan)</h3>
                <p><strong>File Name:</strong> {record.attachment_name or 'Evidence'}</p>
                <img src="{record.attachment_url}" alt="Evidence Scan" style="max-width:100%;max-height:350px;border-radius:8px;border:1px solid #ccc;margin-top:10px;" />
            </div>
            """
        else:
            evidence_html = f"""
            <div style="margin-top:20px;padding:16px;background:#f4f0fa;border-radius:12px;border:1px solid #e2d9f3;">
                <h3 style="color:#d4589a;margin-top:0;">📄 Attached Supporting Evidence (Document/PDF)</h3>
                <p><strong>File Name:</strong> {record.attachment_name or 'Document.pdf'}</p>
                <a href="{record.attachment_url}" target="_blank" style="display:inline-block;padding:10px 18px;background:#d4589a;color:#fff;text-decoration:none;border-radius:20px;font-weight:bold;margin-top:8px;">
                   🔗 Open Attached Evidence File
                </a>
            </div>
            """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>MaternalCare Health Report — #{record.id}</title>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2d2d2d; background: #faf9fd; margin: 0; padding: 40px 20px; }}
            .container {{ max-width: 800px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #eae6f5; }}
            .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #d4589a; padding-bottom: 16px; margin-bottom: 24px; }}
            .brand {{ font-size: 24px; font-weight: 800; color: #d4589a; }}
            .badge {{ display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 12px; text-transform: uppercase; }}
            .badge-verified {{ background: #e6f9f0; color: #10b981; }}
            .badge-under_review {{ background: #fffbeb; color: #f59e0b; }}
            .badge-flagged {{ background: #fef2f2; color: #ef4444; }}
            .meta-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8f6fc; padding: 16px; border-radius: 12px; margin-bottom: 24px; }}
            .meta-item {{ font-size: 14px; }}
            .meta-label {{ color: #716b89; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; }}
            .meta-val {{ color: #1a0a2e; font-size: 16px; font-weight: 700; margin-top: 2px; }}
            .notes {{ background: #fff8eb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin-top: 20px; line-height: 1.6; }}
            .recs {{ background: #f0fdf4; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin-top: 20px; }}
            .footer {{ margin-top: 36px; text-align: center; font-size: 12px; color: #948ea9; border-top: 1px solid #eee; padding-top: 16px; }}
            @media print {{ body {{ background: #fff; padding: 0; }} .container {{ box-shadow: none; border: none; }} }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <div class="brand">🌸 MaternalCare</div>
                    <div style="font-size:13px;color:#716b89;margin-top:2px;">Project-Specific Health Record & Clinical Report</div>
                </div>
                <div>
                    <span class="badge badge-{record.status}">{record.status}</span>
                </div>
            </div>

            <h2 style="color:#1a0a2e;margin-top:0;font-size:22px;">{record.title}</h2>
            <p style="color:#56506d;font-size:15px;line-height:1.5;">{record.description or ''}</p>

            <div class="meta-grid">
                <div class="meta-item">
                    <div class="meta-label">Patient Name</div>
                    <div class="meta-val">{record.patient_name or 'Divya Sharma'}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Gestational Stage</div>
                    <div class="meta-val">Week {record.gestational_week or 24}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Category</div>
                    <div class="meta-val">{record.category}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Risk Classification</div>
                    <div class="meta-val">{record.risk_level or 'Low Risk'}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Role Visibility Scope</div>
                    <div class="meta-val" style="text-transform:uppercase;color:#d4589a;">{record.role_visibility}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Report Date</div>
                    <div class="meta-val">{record.created_at.strftime('%b %d, %Y') if record.created_at else 'Today'}</div>
                </div>
            </div>

            {labs_html}

            {f'<div class="notes"><strong style="color:#b45309;">🩺 Doctor Clinical Notes:</strong><br>{record.doctor_notes}</div>' if record.doctor_notes else ''}

            {f'<div class="recs"><strong style="color:#047857;">💡 AI Recommendations & Action Plan:</strong><ul style="margin:8px 0 0 18px;padding:0;">{recs_html}</ul></div>' if record.recommendations else ''}

            {evidence_html}

            <div class="footer">
                This is an official project-specific clinical record generated by MaternalCare AI Backend Platform.<br>
                Report Reference ID: MC-HR-{record.id}-{record.created_at.strftime('%Y%m%d') if record.created_at else '2026'}
            </div>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)
