from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, date
from typing import List, Optional, Any, Dict

# User & Auth schemas
class UserBase(BaseModel):
    email: EmailStr
    role: str = "mother"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

# Pregnancy Profile schemas
class PregnancyProfileBase(BaseModel):
    lmp_date: Optional[date] = None
    ultrasound_due_date: Optional[date] = None
    current_week: int = 1

class PregnancyProfileCreate(PregnancyProfileBase):
    pass

class PregnancyProfileResponse(PregnancyProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Medicine schemas
class MedicineBase(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    reminders_enabled: bool = True
    schedule_time: Optional[str] = None
    active_status: bool = True
    disclaimer_accepted: bool = True

class MedicineCreate(MedicineBase):
    pass

class MedicineResponse(MedicineBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class MedicineLogCreate(BaseModel):
    log_date: date
    status: str  # taken, missed

class MedicineLogResponse(MedicineLogCreate):
    id: int
    medicine_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Mood Log schemas
class MoodLogCreate(BaseModel):
    mood_score: int
    notes: Optional[str] = None
    voice_analysis_flag: bool = False

class MoodLogResponse(MoodLogCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Emergency Profile schemas
class EmergencyProfileBase(BaseModel):
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contacts: Optional[List[Dict[str, Any]]] = None
    preferred_hospital: Optional[str] = None

class EmergencyProfileCreate(EmergencyProfileBase):
    pass

class EmergencyProfileResponse(EmergencyProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# PCOS Assessment schemas
class PCOSAssessmentCreate(BaseModel):
    # Personal Info
    age: int
    height: float
    weight: float
    trying_to_conceive: bool
    pregnant: bool

    # Menstrual History
    age_at_first_period: int
    cycle_length: int
    regular_periods: bool
    missed_periods: bool
    heavy_bleeding: bool
    painful_periods: bool

    # Symptoms
    symptom_acne: bool
    symptom_excess_facial_hair: bool
    symptom_hair_loss: bool
    symptom_weight_gain: bool
    symptom_difficulty_losing_weight: bool
    symptom_difficulty_conceiving: bool
    symptom_dark_skin_patches: bool
    symptom_fatigue: bool
    symptom_mood_swings: bool
    symptom_sleep_problems: bool
    symptom_irregular_periods: bool
    symptom_pelvic_pain: bool
    symptom_bloating: bool
    symptom_sugar_cravings: bool

    # Lifestyle
    sleep_duration: float
    stress_level: str
    exercise_frequency: str
    diet_quality: str
    water_intake: float
    smoking: str
    alcohol: str
    fast_food_frequency: str
    processed_food_frequency: str
    sugar_intake: str

    # Quick Medical History (Optional)
    diagnosed_pcos: Optional[bool] = None
    family_history_pcos: Optional[bool] = None
    diabetes_prediabetes: Optional[bool] = None
    thyroid_disorder: Optional[bool] = None
    hormonal_medication: Optional[bool] = None
    trying_longer_12_months: Optional[bool] = None

    # Lab Values (Optional)
    lab_tsh: Optional[float] = None
    lab_total_testosterone: Optional[float] = None
    lab_lh: Optional[float] = None
    lab_fsh: Optional[float] = None
    lab_hba1c: Optional[float] = None
    lab_fasting_blood_glucose: Optional[float] = None
    lab_hdl: Optional[float] = None
    lab_ldl: Optional[float] = None
    lab_triglycerides: Optional[float] = None
    lab_total_cholesterol: Optional[float] = None

    # Ultrasound (Optional)
    ultrasound_report_url: Optional[str] = None
    status: str = "completed"

    @field_validator('age')
    @classmethod
    def validate_age(cls, v):
        if not (10 <= v <= 90):
            raise ValueError('Age must be between 10 and 90')
        return v

    @field_validator('height')
    @classmethod
    def validate_height(cls, v):
        if not (50 <= v <= 250):
            raise ValueError('Height must be between 50 and 250 cm')
        return v

    @field_validator('weight')
    @classmethod
    def validate_weight(cls, v):
        if not (20 <= v <= 300):
            raise ValueError('Weight must be between 20 and 300 kg')
        return v

    @field_validator('lab_tsh', 'lab_total_testosterone', 'lab_lh', 'lab_fsh', 
                     'lab_hba1c', 'lab_fasting_blood_glucose', 'lab_hdl', 
                     'lab_ldl', 'lab_triglycerides', 'lab_total_cholesterol')
    @classmethod
    def validate_labs(cls, v):
        if v is not None and v < 0:
            raise ValueError('Lab values cannot be negative')
        return v


class PCOSAssessmentResponse(PCOSAssessmentCreate):
    id: int
    user_id: int
    bmi: float
    created_at: datetime
    
    # Rule calculation fields
    rule_score: Optional[int] = None
    risk_percentage: Optional[int] = None
    risk_level: Optional[str] = None
    reasons: Optional[List[str]] = None

    # Hybrid ML & Fusion fields
    ml_probability: Optional[int] = None
    fusion_score: Optional[int] = None
    confidence: Optional[str] = None
    prediction_timestamp: Optional[datetime] = None
    model_version: Optional[str] = None
    prediction_source: Optional[str] = None

    # Phase 5 Recommendation fields
    explanation: Optional[str] = None
    diet_recommendations: Optional[Dict[str, Any]] = None
    exercise_recommendations: Optional[Dict[str, Any]] = None
    lifestyle_recommendations: Optional[Dict[str, Any]] = None
    reminders: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class PCOSRuleResultResponse(BaseModel):
    rule_score: int
    risk_percentage: int
    risk_level: str
    confidence: str
    reasons: List[str]


class PCOSMedicalReportResponse(BaseModel):
    id: int
    user_id: int
    report_type: str
    upload_date: datetime
    file_path: Optional[str] = None
    raw_text: Optional[str] = None
    extracted_values: Optional[Dict[str, Any]] = None
    normalized_values: Optional[Dict[str, Any]] = None
    confidence_scores: Optional[Dict[str, Any]] = None
    ocr_metadata: Optional[Dict[str, Any]] = None
    ultrasound_findings: Optional[Dict[str, Any]] = None
    is_confirmed: bool

    class Config:
        from_attributes = True


class PCOSMedicalReportConfirmRequest(BaseModel):
    report_id: int
    confirmed_values: Dict[str, Any]
    ultrasound_findings: Optional[Dict[str, Any]] = None


class PCOSPreferencesUpdateRequest(BaseModel):
    email_enabled: bool = True
    push_enabled: bool = True
    reminder_interval_days: int = 30


