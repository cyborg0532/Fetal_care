from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta
from core_backend.database import get_db
from core_backend import models, schemas
from core_backend.routers.auth import get_current_user

router = APIRouter(prefix="/tracker", tags=["tracker"])

BABY_SIZE_BY_WEEK = {
    4: ("Poppy seed", "🌱"), 5: ("Sesame seed", "🫘"), 6: ("Lentil", "🟤"),
    7: ("Blueberry", "🫐"), 8: ("Raspberry", "🫐"), 9: ("Grape", "🍇"),
    10: ("Strawberry", "🍓"), 11: ("Lime", "🍋"), 12: ("Lemon", "🍋"),
    13: ("Peach", "🍑"), 14: ("Nectarine", "🍑"), 15: ("Apple", "🍎"),
    16: ("Avocado", "🥑"), 17: ("Pear", "🍐"), 18: ("Bell pepper", "🫑"),
    19: ("Mango", "🥭"), 20: ("Banana", "🍌"), 21: ("Carrot", "🥕"),
    22: ("Papaya", "🥭"), 23: ("Grapefruit", "🍊"), 24: ("Corn", "🌽"),
    25: ("Cauliflower", "🥦"), 26: ("Lettuce head", "🥬"), 27: ("Eggplant", "🍆"),
    28: ("Cabbage", "🥬"), 29: ("Butternut squash", "🎃"), 30: ("Cucumber", "🥒"),
    31: ("Coconut", "🥥"), 32: ("Squash", "🎃"), 33: ("Pineapple", "🍍"),
    34: ("Cantaloupe", "🍈"), 35: ("Honeydew melon", "🍈"), 36: ("Romaine head", "🥬"),
    37: ("Winter melon", "🍈"), 38: ("Pumpkin", "🎃"), 39: ("Watermelon", "🍉"),
    40: ("Watermelon", "🍉"),
}

WEEKLY_TIPS = {
    1: "Your pregnancy journey begins! Focus on prenatal vitamins with folic acid.",
    4: "The embryo is forming. Avoid alcohol and smoking.",
    8: "Baby's heart is beating! Schedule your first prenatal visit.",
    12: "First trimester complete! Risk of miscarriage drops significantly.",
    18: "Anomaly scan (level 2 ultrasound) is usually done around this week.",
    20: "Halfway there! Baby can now hear sounds.",
    24: "Iron checkup recommended. Stay hydrated.",
    28: "Third trimester begins. Track fetal movements daily.",
    32: "Start preparing your hospital bag.",
    36: "Almost there! Baby is considered full-term at 37 weeks.",
    40: "Due date week! Your little one is ready to meet you.",
}

def get_tip_for_week(week: int) -> str:
    for w in sorted(WEEKLY_TIPS.keys(), reverse=True):
        if week >= w:
            return WEEKLY_TIPS[w]
    return "Take it one day at a time. You are doing great!"

def get_trimester(week: int) -> int:
    if week <= 12:
        return 1
    elif week <= 26:
        return 2
    return 3

@router.get("/dashboard")
def get_dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(models.PregnancyProfile).filter(
        models.PregnancyProfile.user_id == current_user.id
    ).first()

    week = profile.current_week if profile else 1
    due_date = profile.ultrasound_due_date if profile else None
    days_left = (due_date - date.today()).days if due_date else None

    baby_info = BABY_SIZE_BY_WEEK.get(min(week, 40), ("Growing baby", "👶"))

    today_medicines = db.query(models.Medicine).filter(
        models.Medicine.user_id == current_user.id,
        models.Medicine.active_status == True
    ).all()

    recent_mood = db.query(models.MoodLog).filter(
        models.MoodLog.user_id == current_user.id
    ).order_by(models.MoodLog.created_at.desc()).first()

    return {
        "week": week,
        "trimester": get_trimester(week),
        "days_until_due_date": days_left,
        "due_date": str(due_date) if due_date else None,
        "baby_size": baby_info[0],
        "baby_emoji": baby_info[1],
        "weekly_tip": get_tip_for_week(week),
        "medicines_today": [{"name": m.name, "dosage": m.dosage, "schedule_time": m.schedule_time} for m in today_medicines],
        "last_mood_score": recent_mood.mood_score if recent_mood else None,
    }

@router.get("/profile", response_model=schemas.PregnancyProfileResponse)
def get_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(models.PregnancyProfile).filter(
        models.PregnancyProfile.user_id == current_user.id
    ).first()
    if not profile:
        profile = models.PregnancyProfile(user_id=current_user.id, current_week=1)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/profile", response_model=schemas.PregnancyProfileResponse)
def update_profile(
    profile_in: schemas.PregnancyProfileCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(models.PregnancyProfile).filter(
        models.PregnancyProfile.user_id == current_user.id
    ).first()
    if not profile:
        profile = models.PregnancyProfile(user_id=current_user.id)
        db.add(profile)

    if profile_in.lmp_date:
        profile.lmp_date = profile_in.lmp_date
        # Auto-calculate due date from LMP (280 days = 40 weeks)
        profile.ultrasound_due_date = profile_in.lmp_date + timedelta(days=280)
        days_passed = (date.today() - profile_in.lmp_date).days
        profile.current_week = max(1, min(40, days_passed // 7))
    if profile_in.ultrasound_due_date:
        profile.ultrasound_due_date = profile_in.ultrasound_due_date
        days_remaining = (profile_in.ultrasound_due_date - date.today()).days
        profile.current_week = max(1, min(40, 40 - days_remaining // 7))
    if profile_in.current_week:
        profile.current_week = profile_in.current_week

    db.commit()
    db.refresh(profile)
    return profile
