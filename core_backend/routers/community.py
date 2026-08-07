from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from core_backend.database import get_db
from core_backend import models, schemas
from core_backend.routers.auth import get_current_user

router = APIRouter(prefix="/community", tags=["community"])

DEFAULT_GROUPS = [
    {"name": "July 2027 Moms", "description": "Connect with moms due in July 2027", "category": "due-date"},
    {"name": "August 2027 Moms", "description": "Connect with moms due in August 2027", "category": "due-date"},
    {"name": "First-Time Moms", "description": "For first-time mothers navigating the journey", "category": "general"},
    {"name": "Working Moms", "description": "Balancing career and pregnancy together", "category": "general"},
    {"name": "Twin Pregnancy", "description": "The unique joys and challenges of twin pregnancies", "category": "general"},
    {"name": "High-Risk Pregnancy", "description": "Support for mothers with high-risk pregnancies", "category": "risk-category"},
    {"name": "Mumbai Moms", "description": "Local group for mothers in Mumbai", "category": "city"},
    {"name": "Delhi Moms", "description": "Local group for mothers in Delhi", "category": "city"},
]

def seed_default_groups(db: Session):
    count = db.query(models.CommunityGroup).count()
    if count == 0:
        for g in DEFAULT_GROUPS:
            db.add(models.CommunityGroup(**g))
        db.commit()

@router.get("/groups", response_model=List[schemas.CommunityGroupResponse])
def list_groups(db: Session = Depends(get_db)):
    seed_default_groups(db)
    return db.query(models.CommunityGroup).all()

@router.get("/groups/{group_id}/posts", response_model=List[schemas.CommunityPostResponse])
def get_posts(group_id: int, db: Session = Depends(get_db)):
    group = db.query(models.CommunityGroup).filter(models.CommunityGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return db.query(models.CommunityPost).filter(
        models.CommunityPost.group_id == group_id
    ).order_by(models.CommunityPost.created_at.desc()).all()

@router.post("/groups/{group_id}/posts", response_model=schemas.CommunityPostResponse)
def create_post(
    group_id: int,
    post_in: schemas.CommunityPostCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(models.CommunityGroup).filter(models.CommunityGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    post = models.CommunityPost(
        group_id=group_id,
        user_id=current_user.id,
        title=post_in.title,
        content=post_in.content,
    )
    db.add(post)
    group.member_count += 1
    db.commit()
    db.refresh(post)
    return post

@router.get("/posts/{post_id}/comments", response_model=List[schemas.CommunityCommentResponse])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return db.query(models.CommunityComment).filter(
        models.CommunityComment.post_id == post_id
    ).order_by(models.CommunityComment.created_at.asc()).all()

@router.post("/posts/{post_id}/comments", response_model=schemas.CommunityCommentResponse)
def add_comment(
    post_id: int,
    comment_in: schemas.CommunityCommentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = models.CommunityComment(
        post_id=post_id,
        user_id=current_user.id,
        content=comment_in.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
