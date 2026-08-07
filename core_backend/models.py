from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, JSON, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from core_backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="mother")  # mother, partner, family, doctor
    created_at = Column(DateTime, default=datetime.utcnow)

    pregnancy_profile = relationship("PregnancyProfile", back_populates="user", uselist=False)
    medicines = relationship("Medicine", back_populates="user")
    mood_logs = relationship("MoodLog", back_populates="user")
    emergency_profile = relationship("EmergencyProfile", back_populates="user", uselist=False)
    pcos_assessments = relationship("PCOSAssessment", back_populates="user", cascade="all, delete-orphan")
    pcos_reports = relationship("PCOSMedicalReport", back_populates="user", cascade="all, delete-orphan")
    pcos_preferences = Column(JSON, nullable=True)



class PregnancyProfile(Base):
    __tablename__ = "pregnancy_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    lmp_date = Column(Date, nullable=True)
    ultrasound_due_date = Column(Date, nullable=True)
    current_week = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="pregnancy_profile")


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=True)
    frequency = Column(String, nullable=True)  # e.g., "Once daily", "Twice daily"
    reminders_enabled = Column(Boolean, default=True)
    schedule_time = Column(String, nullable=True)  # e.g. "08:00"
    active_status = Column(Boolean, default=True)
    disclaimer_accepted = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="medicines")
    logs = relationship("MedicineLog", back_populates="medicine", cascade="all, delete-orphan")


class MedicineLog(Base):
    __tablename__ = "medicine_logs"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"))
    log_date = Column(Date, nullable=False)
    status = Column(String, nullable=False)  # taken, missed
    created_at = Column(DateTime, default=datetime.utcnow)

    medicine = relationship("Medicine", back_populates="logs")


class MoodLog(Base):
    __tablename__ = "mood_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    mood_score = Column(Integer, nullable=False)  # 1 to 5
    notes = Column(Text, nullable=True)
    voice_analysis_flag = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="mood_logs")


class EmergencyProfile(Base):
    __tablename__ = "emergency_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    blood_group = Column(String, nullable=True)
    allergies = Column(Text, nullable=True)
    emergency_contacts = Column(JSON, nullable=True)  # [{"name": "John", "phone": "123", "relation": "Husband"}]
    preferred_hospital = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="emergency_profile")


class PCOSAssessment(Base):
    __tablename__ = "pcos_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    status = Column(String, default="completed")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Personal Information
    age = Column(Integer, nullable=False)
    height = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)
    bmi = Column(Float, nullable=False)
    trying_to_conceive = Column(Boolean, default=False)
    pregnant = Column(Boolean, default=False)

    # Menstrual History
    age_at_first_period = Column(Integer, nullable=False)
    cycle_length = Column(Integer, nullable=False)
    regular_periods = Column(Boolean, default=True)
    missed_periods = Column(Boolean, default=False)
    heavy_bleeding = Column(Boolean, default=False)
    painful_periods = Column(Boolean, default=False)

    # Symptoms Survey
    symptom_acne = Column(Boolean, default=False)
    symptom_excess_facial_hair = Column(Boolean, default=False)
    symptom_hair_loss = Column(Boolean, default=False)
    symptom_weight_gain = Column(Boolean, default=False)
    symptom_difficulty_losing_weight = Column(Boolean, default=False)
    symptom_difficulty_conceiving = Column(Boolean, default=False)
    symptom_dark_skin_patches = Column(Boolean, default=False)
    symptom_fatigue = Column(Boolean, default=False)
    symptom_mood_swings = Column(Boolean, default=False)
    symptom_sleep_problems = Column(Boolean, default=False)
    symptom_irregular_periods = Column(Boolean, default=False)
    symptom_pelvic_pain = Column(Boolean, default=False)
    symptom_bloating = Column(Boolean, default=False)
    symptom_sugar_cravings = Column(Boolean, default=False)

    # Lifestyle Survey
    sleep_duration = Column(Float, nullable=False)
    stress_level = Column(String, nullable=False)
    exercise_frequency = Column(String, nullable=False)
    diet_quality = Column(String, nullable=False)
    water_intake = Column(Float, nullable=False)
    smoking = Column(String, nullable=False)
    alcohol = Column(String, nullable=False)
    fast_food_frequency = Column(String, nullable=False)
    processed_food_frequency = Column(String, nullable=False)
    sugar_intake = Column(String, nullable=False)

    # Quick Medical History (Optional)
    diagnosed_pcos = Column(Boolean, nullable=True)
    family_history_pcos = Column(Boolean, nullable=True)
    diabetes_prediabetes = Column(Boolean, nullable=True)
    thyroid_disorder = Column(Boolean, nullable=True)
    hormonal_medication = Column(Boolean, nullable=True)
    trying_longer_12_months = Column(Boolean, nullable=True)

    # Lab Values (Optional / Skip)
    lab_tsh = Column(Float, nullable=True)
    lab_total_testosterone = Column(Float, nullable=True)
    lab_lh = Column(Float, nullable=True)
    lab_fsh = Column(Float, nullable=True)
    lab_hba1c = Column(Float, nullable=True)
    lab_fasting_blood_glucose = Column(Float, nullable=True)
    lab_hdl = Column(Float, nullable=True)
    lab_ldl = Column(Float, nullable=True)
    lab_triglycerides = Column(Float, nullable=True)
    lab_total_cholesterol = Column(Float, nullable=True)

    # Ultrasound (Skip supported)
    ultrasound_report_url = Column(String, nullable=True)

    # Rule Engine Results
    rule_score = Column(Integer, nullable=True)
    risk_percentage = Column(Integer, nullable=True)
    risk_level = Column(String, nullable=True)
    reasons = Column(JSON, nullable=True)

    # Phase 3 Hybrid AI Results
    ml_probability = Column(Integer, nullable=True)
    fusion_score = Column(Integer, nullable=True)
    confidence = Column(String, nullable=True)
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)
    model_version = Column(String, nullable=True)
    prediction_source = Column(String, nullable=True)

    # Phase 5 Recommendations and Explanations
    explanation = Column(Text, nullable=True)
    diet_recommendations = Column(JSON, nullable=True)
    exercise_recommendations = Column(JSON, nullable=True)
    lifestyle_recommendations = Column(JSON, nullable=True)
    reminders = Column(JSON, nullable=True)

    user = relationship("User", back_populates="pcos_assessments")


class PCOSMedicalReport(Base):
    __tablename__ = "pcos_medical_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String, nullable=False)  # "blood_test", "ultrasound", "other"
    upload_date = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String, nullable=True)
    raw_text = Column(Text, nullable=True)
    extracted_values = Column(JSON, nullable=True)
    normalized_values = Column(JSON, nullable=True)
    confidence_scores = Column(JSON, nullable=True)
    ocr_metadata = Column(JSON, nullable=True)
    ultrasound_findings = Column(JSON, nullable=True)
    is_confirmed = Column(Boolean, default=False)

    user = relationship("User", back_populates="pcos_reports")


