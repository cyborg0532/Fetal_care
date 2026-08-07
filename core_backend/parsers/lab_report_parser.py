# lab_report_parser.py — Regular expression parser extracting structured lab metrics from OCR text
import re
import logging
from typing import Dict, Any, Tuple
from core_backend.validators.unit_converter import UnitConverter

logger = logging.getLogger("uvicorn.error")

class LabReportParser:
    @staticmethod
    def parse_text(text: str) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, int]]:
        """
        Parses OCR raw text and extracts:
        - raw_extracted: { "lab_tsh": { "test_name": "Tsh", "value": 6.2, "unit": "uIU/mL" } }
        - normalized: { "lab_tsh": 6.2, "lab_total_testosterone": 85.0, ... }
        - confidence: { "lab_tsh": 95, "lab_total_testosterone": 92 }
        """
        raw_extracted = {}
        normalized = {}
        confidence = {}

        # Regex templates for targeted metrics
        patterns = {
            "lab_tsh": [
                r"(?i)\bTSH\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bThyroid\s+Stimulating\s+Hormone\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?"
            ],
            "lab_total_testosterone": [
                r"(?i)\bTotal\s+Testosterone\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bTestosterone\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?"
            ],
            "lab_lh": [
                r"(?i)\bLH\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bLuteinizing\s+Hormone\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?"
            ],
            "lab_fsh": [
                r"(?i)\bFSH\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bFollicle\s+Stimulating\s+Hormone\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?"
            ],
            "lab_hba1c": [
                r"(?i)\bHbA1c\b.*?[:\-\s]+([0-9\.]+)\s*(%)?",
                r"(?i)\bGlycosylated\s+Hemoglobin\b.*?[:\-\s]+([0-9\.]+)\s*(%)?"
            ],
            "lab_fasting_blood_glucose": [
                r"(?i)\bFasting\s+(Blood\s+)?Glucose\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bFBS\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bGlucose\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?"
            ],
            "lab_hdl": [
                r"(?i)\bHDL\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bHDL\s+Cholesterol\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?"
            ],
            "lab_ldl": [
                r"(?i)\bLDL\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bLDL\s+Cholesterol\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?"
            ],
            "lab_triglycerides": [
                r"(?i)\bTriglycerides\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bTG\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?"
            ],
            "lab_total_cholesterol": [
                r"(?i)\bTotal\s+Cholesterol\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?",
                r"(?i)\bCholesterol\b.*?[:\-\s]+([0-9\.]+)\s*([a-z/]+)?"
            ]
        }

        # Clean multiple spaces to prevent parsing failure
        clean_text = re.sub(r'\s+', ' ', text)

        for field, rx_list in patterns.items():
            found = False
            for rx in rx_list:
                match = re.search(rx, clean_text)
                if match:
                    val_str = match.group(1)
                    unit_str = match.group(2) if len(match.groups()) > 1 else None
                    
                    try:
                        value = float(val_str)
                        test_display = field.replace("lab_", "").replace("_", " ").title()
                        
                        raw_extracted[field] = {
                            "test_name": test_display,
                            "value": value,
                            "unit": unit_str or ""
                        }
                        
                        # Normalize units
                        norm_val, norm_unit = UnitConverter.normalize_value(test_display, value, unit_str)
                        normalized[field] = norm_val
                        
                        # Calculate OCR confidence score
                        confidence[field] = 98 if unit_str else 84
                        found = True
                        break
                    except ValueError:
                        continue
            if not found:
                normalized[field] = None
                confidence[field] = 0

        return raw_extracted, normalized, confidence
