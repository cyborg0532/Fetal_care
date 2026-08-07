from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from core_backend.database import get_db
from core_backend import models, schemas
from core_backend.routers.auth import get_current_user

router = APIRouter(prefix="/mood", tags=["mood"])

MOOD_SUGGESTIONS = {
    1: {"label": "Very Low", "emoji": "😢", "suggestion": "It seems you're having a tough day. Consider reaching out to a counselor or someone you trust for support.", "action": "Talk to someone"},
    2: {"label": "Low", "emoji": "😔", "suggestion": "You seem a little down. Try a 5-minute breathing exercise or take a short walk. You're not alone.", "action": "Breathing exercise"},
    3: {"label": "Okay", "emoji": "😐", "suggestion": "A balanced day. Remember to hydrate and rest.", "action": "Hydration reminder"},
    4: {"label": "Good", "emoji": "😊", "suggestion": "Great energy! Maybe log your healthy meal or take a moment to celebrate your progress.", "action": "Celebrate progress"},
    5: {"label": "Excellent", "emoji": "🌟", "suggestion": "You're glowing! Your positivity is wonderful for you and your baby.", "action": "Celebrate today"},
}

@router.post("/", response_model=schemas.MoodLogResponse)
def log_mood(
    mood_in: schemas.MoodLogCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not (1 <= mood_in.mood_score <= 5):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Mood score must be between 1 and 5")
    
    log = models.MoodLog(
        user_id=current_user.id,
        mood_score=mood_in.mood_score,
        notes=mood_in.notes,
        voice_analysis_flag=mood_in.voice_analysis_flag,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.get("/", response_model=List[schemas.MoodLogResponse])
def get_mood_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.MoodLog).filter(
        models.MoodLog.user_id == current_user.id
    ).order_by(models.MoodLog.created_at.desc()).limit(30).all()

@router.get("/summary")
def get_mood_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(models.MoodLog).filter(
        models.MoodLog.user_id == current_user.id
    ).order_by(models.MoodLog.created_at.desc()).limit(7).all()

    if not logs:
        return {"message": "No mood logs yet. Log your first mood today!", "average": None, "suggestion": None}
    
    scores = [l.mood_score for l in logs]
    avg = round(sum(scores) / len(scores), 1)
    avg_rounded = max(1, min(5, round(avg)))
    suggestion_info = MOOD_SUGGESTIONS[avg_rounded]
    
    low_streak = sum(1 for s in scores[:5] if s <= 2)
    alert = None
    if low_streak >= 3:
        alert = "We've noticed you've been feeling low for several days. Please consider speaking with a mental health professional or your doctor. 💙"
    
    return {
        "average_score": avg,
        "label": suggestion_info["label"],
        "emoji": suggestion_info["emoji"],
        "suggestion": suggestion_info["suggestion"],
        "action": suggestion_info["action"],
        "logs_count": len(logs),
        "trend": scores,
        "alert": alert,
        "disclaimer": "This is not a diagnostic tool. Only a mental health professional can assess your wellbeing."
    }

@router.get("/suggestions/{score}")
def get_mood_suggestion(score: int):
    if not (1 <= score <= 5):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Score must be 1-5")
    return MOOD_SUGGESTIONS[score]
