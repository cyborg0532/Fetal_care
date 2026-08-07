# unit_converter.py — Normalizes lab report values into consistent internal formats
from typing import Tuple, Optional
import logging

logger = logging.getLogger("uvicorn.error")

class UnitConverter:
    @staticmethod
    def normalize_value(test_name: str, value: float, unit: Optional[str]) -> Tuple[float, str]:
        """
        Converts the test value into internal formats.
        Returns a tuple of (normalized_value, normalized_unit).
        """
        if not unit:
            return value, ""
            
        unit_clean = unit.strip().lower()
        test_clean = test_name.strip().lower()
        
        # 1. Total Testosterone conversion (Internal Standard: ng/dL)
        if "testosterone" in test_clean:
            if "nmol/l" in unit_clean:
                # 1 nmol/L = 28.84 ng/dL for testosterone
                norm_val = round(value * 28.84, 2)
                return norm_val, "ng/dL"
            elif "ng/ml" in unit_clean:
                # 1 ng/mL = 100 ng/dL
                norm_val = round(value * 100.0, 2)
                return norm_val, "ng/dL"
            elif "pg/ml" in unit_clean:
                # 1 pg/mL = 0.1 ng/dL
                norm_val = round(value * 0.1, 2)
                return norm_val, "ng/dL"
            return value, "ng/dL"
            
        # 2. Fasting / Random Blood Glucose conversion (Internal Standard: mg/dL)
        elif "glucose" in test_clean or "sugar" in test_clean:
            if "mmol/l" in unit_clean:
                # 1 mmol/L = 18.018 mg/dL for glucose
                norm_val = round(value * 18.018, 2)
                return norm_val, "mg/dL"
            return value, "mg/dL"
            
        # 3. Thyroid Stimulating Hormone (Internal Standard: uIU/mL)
        elif "tsh" in test_clean:
            # uIU/mL, mIU/L, mIU/mL are equivalent
            return value, "uIU/mL"
            
        # 4. LH & FSH (Internal Standard: mIU/mL)
        elif "lh" in test_clean or "fsh" in test_clean:
            return value, "mIU/mL"
            
        # 5. HbA1c (Internal Standard: %)
        elif "hba1c" in test_clean:
            return value, "%"
            
        # Default mapping
        return value, unit
