# model_loader.py — Loads the PCOS machine learning classifier once at application boot or request
import logging
import os
from typing import Any
from core_backend.rules.pcos_rules import PCOS_RULES_CONFIG

logger = logging.getLogger("uvicorn.error")

class ModelLoader:
    _model: Any = None
    _loaded: bool = False
    
    @classmethod
    def load_model(cls) -> Any:
        """
        Lazy loads pcos_model.pkl using joblib. Caches the loaded model.
        Returns None if joblib is not installed, if scikit-learn is missing, 
        or if the model file is missing or corrupted.
        """
        if cls._loaded:
            return cls._model
            
        model_path = PCOS_RULES_CONFIG["fusion"].get("model_path", "core_backend/ml/pcos_model.pkl")
        
        # Convert to absolute path if relative
        if not os.path.isabs(model_path):
            # Get the project root directory (where core_backend folder is)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            model_path = os.path.join(project_root, model_path)
        
        # 1. Check if model file exists
        if not os.path.exists(model_path):
            logger.warning(f"PCOS ML model file not found at '{model_path}'. Fallback: Rule-Based evaluation will be used.")
            cls._model = None
            cls._loaded = True
            return None
            
        # 2. Try importing joblib
        try:
            import joblib
        except ImportError:
            logger.warning("Package 'joblib' is not installed. Fallback: Rule-Based evaluation will be used.")
            cls._model = None
            cls._loaded = True
            return None
            
        # 3. Try importing sklearn (to make sure model can unpickle standard classes)
        try:
            import sklearn
        except ImportError:
            logger.warning("Package 'scikit-learn' (sklearn) is not installed. Fallback: Rule-Based evaluation will be used.")
            cls._model = None
            cls._loaded = True
            return None
            
        # 4. Load model
        try:
            cls._model = joblib.load(model_path)
            logger.info(f"PCOS ML model successfully loaded from '{model_path}' (scikit-learn version: {sklearn.__version__}).")
        except Exception as e:
            logger.error(f"Failed to load PCOS model from '{model_path}': {e}. Fallback: Rule-Based evaluation will be used.")
            cls._model = None
            
        cls._loaded = True
        return cls._model
