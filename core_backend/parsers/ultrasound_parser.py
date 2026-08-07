# ultrasound_parser.py — Scans pelvic ultrasound report text for polycystic ovarian morphology markers
import re
from typing import Dict, Any

class UltrasoundParser:
    @staticmethod
    def parse_text(text: str) -> Dict[str, Any]:
        """
        Scans text for keywords suggestive of polycystic ovarian morphology features.
        Returns a dictionary of boolean findings.
        """
        text_lower = text.lower()
        
        findings = {
            "polycystic_ovary_morphology": False,
            "multiple_follicles": False,
            "enlarged_ovaries": False,
            "normal_ovaries": False,
            "no_polycystic_morphology": False
        }
        
        # 1. Polycystic morphology check
        if any(kw in text_lower for kw in ["polycystic", "pcom", "necklace pattern", "pearl pattern"]):
            findings["polycystic_ovary_morphology"] = True
            
        # 2. Multiple follicles check
        if any(kw in text_lower for kw in ["multiple follicles", "many follicles", "subcentimeter follicles", "12 or more follicles", "multiple small follicles"]):
            findings["multiple_follicles"] = True
            
        # 3. Enlarged ovaries check
        if any(kw in text_lower for kw in ["enlarged ovaries", "ovarian volume > 10", "increased volume"]):
            findings["enlarged_ovaries"] = True
            
        # 4. Normal ovaries check
        if any(kw in text_lower for kw in ["normal ovaries", "normal size", "normal morphology"]):
            findings["normal_ovaries"] = True
            
        # 5. Explicit normal morphology statement
        if any(kw in text_lower for kw in ["no polycystic", "no features of pcos", "no pco"]):
            findings["no_polycystic_morphology"] = True
            
        return findings
