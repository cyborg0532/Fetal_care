import os
import csv
import joblib
from sklearn.ensemble import RandomForestClassifier

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "pcos_dataset.csv")
MODEL_PATH = os.path.join(BASE_DIR, "pcos_model.pkl")

# Helper map mappings to construct the 30-element feature vector
# Matching the preprocessing schema exactly!
def build_feature_vector(row):
    vector = []
    
    # 1. Age
    vector.append(float(row.get("age", 25.0) or 25.0))
    # 2. BMI
    vector.append(float(row.get("bmi", 22.0) or 22.0))
    # 3. Cycle Length
    vector.append(float(row.get("cycle_length", 28.0) or 28.0))
    # 4. Irregular Periods
    vector.append(float(row.get("irregular_periods", 0.0) or 0.0))
    # 5. Missed Periods (default 0.0)
    vector.append(0.0)
    # 6. Acne
    vector.append(0.0)
    # 7. Facial Hair
    vector.append(0.0)
    # 8. Hair Loss
    vector.append(0.0)
    # 9. Dark Skin Patches
    vector.append(0.0)
    # 10. Weight Gain
    vector.append(0.0)
    # 11. Difficulty Conceiving
    vector.append(0.0)
    
    # 12. Lifestyle Score (default average score 1.0)
    vector.append(1.0)
    # 13. Medical History Score (default 0.0)
    vector.append(0.0)
    
    # 14. TSH
    vector.append(float(row.get("lab_tsh", 2.0) or 2.0))
    # 15. LH
    lh = float(row.get("lab_lh", 5.0) or 5.0)
    vector.append(lh)
    # 16. FSH
    fsh = float(row.get("lab_fsh", 5.5) or 5.5)
    vector.append(fsh)
    # 17. LH/FSH Ratio
    vector.append(float(lh / fsh if fsh > 0 else 1.0))
    # 18. Testosterone
    vector.append(float(row.get("lab_total_testosterone", 25.0) or 25.0))
    # 19. HbA1c
    vector.append(float(row.get("lab_hba1c", 5.3) or 5.3))
    # 20. Fasting Blood Glucose
    vector.append(float(row.get("lab_fasting_blood_glucose", 90.0) or 90.0))
    # 21. HDL
    vector.append(55.0)
    # 22. LDL
    vector.append(100.0)
    # 23. Triglycerides
    vector.append(100.0)
    
    # 24. Sleep duration
    vector.append(7.5)
    # 25. Stress Level (moderate = 1.0)
    vector.append(1.0)
    # 26. Exercise Frequency (sometimes = 1.0)
    vector.append(1.0)
    # 27. Diet Score (average = 1.0)
    vector.append(1.0)
    # 28. Water Intake
    vector.append(8.0)
    # 29. Smoking
    vector.append(0.0)
    # 30. Alcohol
    vector.append(0.0)

    return vector

def train_model():
    if not os.path.exists(CSV_PATH):
        print(f"Error: structured dataset '{CSV_PATH}' not found. Please run extract_pcos_data.py first.")
        return

    X = []
    y = []

    # Read the extracted dataset
    with open(CSV_PATH, mode="r", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            features = build_feature_vector(row)
            X.append(features)
            y.append(int(row["has_pcos"]))

    if not X:
        print("Error: No training samples found in dataset.")
        return

    print(f"Loaded {len(X)} samples for training.")

    # Initialize and fit RandomForest Classifier
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)

    # Save model
    joblib.dump(clf, MODEL_PATH)
    print(f"Success! PCOS ML model trained and saved to: {MODEL_PATH}")

if __name__ == "__main__":
    train_model()
