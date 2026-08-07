# predictor.py — Performs inference using the loaded scikit-learn model
import time
import logging
from typing import Dict, Any
from core_backend.ml.model_loader import ModelLoader
from core_backend.ml.preprocessing import preprocess_assessment
from core_backend.rules.pcos_rules import PCOS_RULES_CONFIG

logger = logging.getLogger("uvicorn.error")

class PCOSMLPredictor:
    @classmethod
    def predict(cls, assessment_data: Any) -> Dict[str, Any]:
        """
        Runs the ML model inference on the assessment.
        Calculates and logs execution time, falling back gracefully to 
        Rule-Based mode if the model is not loaded.
        """
        model = ModelLoader.load_model()
        if model is None:
            return {
                "probability": 0.0,
                "confidence": "Rule-Based",
                "model_version": "none",
                "available": False
            }
            
        start_time = time.time()
        try:
            # Generate feature vector
            feature_vector = preprocess_assessment(assessment_data)
            
            # Predict probability
            if hasattr(model, "predict_proba"):
                # predict_proba returns [[prob_class_0, prob_class_1]]
                proba = model.predict_proba([feature_vector])[0][1]
            else:
                # Fallback if the custom model only implements predict
                val = model.predict([feature_vector])[0]
                proba = float(val) if val <= 1.0 else float(val / 100.0)
                
            inference_time_ms = round((time.time() - start_time) * 1000, 2)
            version = PCOS_RULES_CONFIG["fusion"].get("model_version", "v1")
            
            logger.info(f"PCOS ML Inference successful. Model version: '{version}'. Execution Time: {inference_time_ms} ms.")
            
            return {
                "probability": round(proba, 4),
                "confidence": "Model",
                "model_version": version,
                "available": True,
                "inference_time_ms": inference_time_ms
            }
        except Exception as e:
            logger.error(f"PCOS ML Inference failed: {e}. Fallback: Rule-Based evaluation will be used.")
            return {
                "probability": 0.0,
                "confidence": "Rule-Based",
                "model_version": "none",
                "available": False,
                "error": str(e)
            }
            
    @classmethod
    def predict_probability(cls, assessment_data: Any) -> float:
        """Helper returning raw class probability float (0.0 to 1.0)."""
        res = cls.predict(assessment_data)
        return res.get("probability", 0.0)
