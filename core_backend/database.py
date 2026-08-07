from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core_backend.config import settings

# Neon DB (PostgreSQL) — direct connection, IPv4 fully supported
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # verify connections are alive before using
    pool_recycle=300,          # recycle idle connections every 5 min
    pool_size=5,               # max persistent connections
    max_overflow=10,           # extra connections allowed under load
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
