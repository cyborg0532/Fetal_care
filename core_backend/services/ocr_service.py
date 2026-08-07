from abc import ABC, abstractmethod
import os
import logging
from typing import Optional

logger = logging.getLogger("uvicorn.error")

class BaseOCREngine(ABC):
    @abstractmethod
    def extract_text(self, file_path: str, original_filename: Optional[str] = None) -> str:
        """Extracts raw text from the specified PDF or image path."""
        pass


class LocalMockOCREngine(BaseOCREngine):
    def extract_text(self, file_path: str, original_filename: Optional[str] = None) -> str:
        """
        Mock extraction based on filename keyword matching for deterministic end-to-end tests.
        """
        lookup_name = original_filename if original_filename else os.path.basename(file_path)
        filename = lookup_name.lower()
        logger.info(f"Mock OCR processing file: {filename}")
        
        # Match report types based on filename keys
        if "tsh" in filename:
            return (
                "METROPOLIS LABORATORY REPORT\n"
                "Patient: Jane Doe. Date: 2026-07-25\n"
                "TEST NAME: TSH (Thyroid Stimulating Hormone)\n"
                "RESULT: 6.2 uIU/mL\n"
                "REFERENCE RANGE: 0.40 - 4.50 uIU/mL"
            )
        elif "testosterone" in filename:
            return (
                "PATHCARE DIAGNOSTICS\n"
                "Date: 2026-07-24\n"
                "HORMONE PANEL:\n"
                "Total Testosterone: 85.0 ng/dL (Ref: 15.0 - 46.0 ng/dL)\n"
                "Free Testosterone: 2.4 ng/dL\n"
            )
        elif "lh" in filename or "fsh" in filename:
            return (
                "LAL PATH LABS HORMONE SCREEN\n"
                "LH (Luteinizing Hormone): 18.5 mIU/mL\n"
                "FSH (Follicle Stimulating Hormone): 5.2 mIU/mL\n"
                "Ratio: 3.56"
            )
        elif "ultrasound" in filename or "pelvic" in filename:
            return (
                "SNEHA ULTRASOUND & IMAGING CENTRE\n"
                "PELVIC ULTRASOUND SCAN REPORT\n"
                "Uterus: Normal size and shape.\n"
                "Ovaries: Both ovaries are enlarged. Left Ovary Volume: 12.5 cc. Right Ovary Volume: 11.8 cc.\n"
                "Findings: Both ovaries show polycystic ovarian morphology with multiple small follicles (12 or more, measuring 2-9 mm) arranged in a 'necklace' pattern peripherally.\n"
                "Impression: Features suggestive of Polycystic Ovarian Morphology."
            )
        elif "lipid" in filename or "cholesterol" in filename:
            return (
                "LIPID PROFILE TEST REPORT\n"
                "Total Cholesterol: 245 mg/dL\n"
                "Triglycerides: 185 mg/dL\n"
                "HDL Cholesterol: 42 mg/dL\n"
                "LDL Cholesterol: 166 mg/dL"
            )
        elif "diabetes" in filename or "glucose" in filename or "hba1c" in filename:
            return (
                "GLYCOSYLATED HEMOGLOBIN REPORT\n"
                "HbA1c: 6.2 % (Ref: < 5.7% Normal, 5.7% - 6.4% Prediabetes)\n"
                "Fasting Blood Glucose: 115 mg/dL\n"
            )
        else:
            # Generic fallback blood test report containing several elements
            return (
                "CENTRAL HEALTH LABORATORY WORKUP\n"
                "TSH: 2.8 uIU/mL\n"
                "Total Testosterone: 35.0 ng/dL\n"
                "LH: 8.0 mIU/mL\n"
                "FSH: 7.2 mIU/mL\n"
                "HbA1c: 5.4 %\n"
                "Fasting Blood Glucose: 92.0 mg/dL\n"
                "HDL: 54.0 mg/dL\n"
                "LDL: 105.0 mg/dL\n"
                "Triglycerides: 110.0 mg/dL"
            )


class OCRService:
    _engine: BaseOCREngine = LocalMockOCREngine()

    @classmethod
    def set_engine(cls, engine: BaseOCREngine):
        cls._engine = engine

    @classmethod
    def extract_text(cls, file_path: str, original_filename: Optional[str] = None) -> str:
        """Dispatches extraction task to the configured OCR engine."""
        return cls._engine.extract_text(file_path, original_filename=original_filename)
