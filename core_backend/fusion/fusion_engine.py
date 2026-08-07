# fusion_engine.py — Combines clinical rules score and ML model predictions
from typing import Dict, Any, List
from core_backend.rules.pcos_rules import PCOS_RULES_CONFIG

class HybridFusionEngine:
    @staticmethod
    def fuse(rule_result: Dict[str, Any], ml_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combines rule-based risk percentage with ML classification probability
        using configurable weights. Falls back to pure rule metrics if ML is missing.
        """
        # If ML model was not available or prediction was unsuccessful, run rule-based fallback
        if not ml_result.get("available", False):
            return {
                "overall_score": rule_result["risk_percentage"],
                "rule_score": rule_result["risk_percentage"],
                "ml_probability": 0,
                "risk_level": rule_result["risk_level"],
                "confidence": "Rule-Based",
                "reasons": rule_result["reasons"],
                "model_version": "none",
                "prediction_source": "Rule Engine Only"
            }
            
        # Retrieve weights from settings config
        fusion_config = PCOS_RULES_CONFIG["fusion"]
        w_rule = fusion_config.get("rule_weight", 0.40)
        w_ml = fusion_config.get("ml_weight", 0.60)
        
        rule_score = rule_result["risk_percentage"]
        ml_prob_pct = int(ml_result["probability"] * 100)
        
        # Calculate combined weighted score
        overall_score = int(rule_score * w_rule + ml_prob_pct * w_ml)
        overall_score = min(100, max(0, overall_score))
        
        # Map score to risk levels
        risk_level = "Low"
        for mapping in PCOS_RULES_CONFIG["RISK_LEVEL_MAPPING"]:
            if overall_score <= mapping["max_pct"]:
                risk_level = mapping["level"]
                break
                
        return {
            "overall_score": overall_score,
            "rule_score": rule_score,
            "ml_probability": ml_prob_pct,
            "risk_level": risk_level,
            "confidence": "Hybrid AI",
            "reasons": rule_result["reasons"],  # Retain rule engine warnings for clinical clarity
            "model_version": ml_result["model_version"],
            "prediction_source": "Rule + ML Fusion"
        }
