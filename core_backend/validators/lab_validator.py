# lab_validator.py — Validates extracted report values against clinical sanity thresholds
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger("uvicorn.error")

# Standard physiological sanity check ranges (Min, Max)
PHYSIOLOGICAL_RANGES = {
    "tsh": (0.01, 150.0),                  # uIU/mL
    "total_testosterone": (2.0, 600.0),    # ng/dL
    "lh": (0.1, 100.0),                    # mIU/mL
    "fsh": (0.1, 100.0),                   # mIU/mL
    "hba1c": (3.0, 20.0),                  # %
    "fasting_blood_glucose": (30.0, 600.0), # mg/dL
    "hdl": (5.0, 150.0),                   # mg/dL
    "ldl": (10.0, 400.0),                  # mg/dL
    "triglycerides": (10.0, 1000.0),       # mg/dL
    "total_cholesterol": (50.0, 500.0)     # mg/dL
}

class LabValidator:
    @staticmethod
    def validate_values(normalized_values: Dict[str, Any]) -> Tuple[List[str], Dict[str, bool]]:
        """
        Validates normalized values against standard physiological ranges and flags impossible ones.
        Returns a tuple of (errors_list, warnings_map).
        """
        errors = []
        validation_status = {}  # Map of field -> is_valid (True/False)
        
        for test_key, val in normalized_values.items():
            if val is None or val == "":
                continue
                
            try:
                numeric_val = float(val)
            except (ValueError, TypeError):
                errors.append(f"Invalid non-numeric value '{val}' for test '{test_key}'.")
                validation_status[test_key] = False
                continue
                
            # Impossible/physiological limits checks
            if numeric_val <= 0:
                errors.append(f"Test '{test_key}' value must be greater than zero.")
                validation_status[test_key] = False
                continue
                
            # Range check for defined tests
            if test_key in PHYSIOLOGICAL_RANGES:
                min_val, max_val = PHYSIOLOGICAL_RANGES[test_key]
                if not (min_val <= numeric_val <= max_val):
                    errors.append(f"Extracted value {numeric_val} for '{test_key}' is outside plausible physiological ranges ({min_val} - {max_val}).")
                    validation_status[test_key] = False
                else:
                    validation_status[test_key] = True
            else:
                validation_status[test_key] = True
                
        return errors, validation_status
