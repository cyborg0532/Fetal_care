import os
import re
import csv
from pypdf import PdfReader

# Configure absolute paths to find inputs and outputs correctly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PCOS_DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "PcosData"))
OUTPUT_CSV = os.path.join(BASE_DIR, "pcos_dataset.csv")

# Structured fields representing standard PCOS assessment indicators
FIELDS = [
    "filename",
    "age",
    "bmi",
    "cycle_length",
    "irregular_periods",
    "lab_lh",
    "lab_fsh",
    "lab_total_testosterone",
    "lab_tsh",
    "lab_hba1c",
    "lab_fasting_blood_glucose",
    "has_polycystic_ovaries",
    "follicle_count_left",
    "follicle_count_right",
    "ovary_volume_left",
    "ovary_volume_right",
    "has_pcos"  # Target label: 1 = Yes, 0 = No
]

def extract_text_from_pdf(pdf_path: str) -> str:
    """Reads all pages from the PDF file and returns concatenated text."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        print(f"[Error] Failed to read {os.path.basename(pdf_path)}: {e}")
        return ""

def parse_clinical_text(filename: str, text: str) -> dict:
    """
    Parses lab parameters and ultrasound markers using regex patterns.
    Defaults to standard clinical values if parameters are missing.
    """
    data = {f: "" for f in FIELDS}
    data["filename"] = filename
    
    lower_text = text.lower()
    lower_filename = filename.lower()
    
    # Classify the classification label (has_pcos) based on explicit keywords
    if "pcos" in lower_filename or "positive" in lower_text or "has pcos" in lower_text:
        data["has_pcos"] = 1
    else:
        data["has_pcos"] = 0

    # 1. Age
    age_match = re.search(r"(?:age|yr|years?)\s*[:\-]?\s*(\d{2})", lower_text)
    if age_match:
        data["age"] = int(age_match.group(1))

    # 2. BMI
    bmi_match = re.search(r"bmi\s*[:\-]?\s*(\d{2}(?:\.\d)?)", lower_text)
    if bmi_match:
        data["bmi"] = float(bmi_match.group(1))

    # 3. Cycle Length
    cycle_match = re.search(r"(?:cycle length|menstrual cycle|period cycle)\s*[:\-]?\s*(\d{2})\s*(?:days)?", lower_text)
    if cycle_match:
        data["cycle_length"] = int(cycle_match.group(1))

    # 4. Irregular periods indicator
    if "irregular" in lower_text or "oligomenorr" in lower_text or "amenorr" in lower_text:
        data["irregular_periods"] = 1
    else:
        data["irregular_periods"] = 0

    # 5. Lab Metrics
    # LH
    lh_match = re.search(r"\blh\b[^0-9]*(\d+(?:\.\d+)?)", lower_text)
    if lh_match:
        data["lab_lh"] = float(lh_match.group(1))
    
    # FSH
    fsh_match = re.search(r"\bfsh\b[^0-9]*(\d+(?:\.\d+)?)", lower_text)
    if fsh_match:
        data["lab_fsh"] = float(fsh_match.group(1))

    # Total Testosterone
    testo_match = re.search(r"(?:total testosterone|testosterone)\b[^0-9]*(\d+(?:\.\d+)?)", lower_text)
    if testo_match:
        data["lab_total_testosterone"] = float(testo_match.group(1))

    # TSH
    tsh_match = re.search(r"\btsh\b[^0-9]*(\d+(?:\.\d+)?)", lower_text)
    if tsh_match:
        data["lab_tsh"] = float(tsh_match.group(1))

    # HbA1c
    hba1c_match = re.search(r"\bhba1c\b[^0-9]*(\d+(?:\.\d+)?)", lower_text)
    if hba1c_match:
        data["lab_hba1c"] = float(hba1c_match.group(1))

    # Fasting Blood Glucose
    fbg_match = re.search(r"(?:fasting glucose|fasting blood sugar|fbg|fbs)\b[^0-9]*(\d+(?:\.\d+)?)", lower_text)
    if fbg_match:
        data["lab_fasting_blood_glucose"] = float(fbg_match.group(1))

    # 6. Ultrasound Findings
    if "polycystic" in lower_text or "pcom" in lower_text or "necklace pattern" in lower_text:
        data["has_polycystic_ovaries"] = 1
    else:
        data["has_polycystic_ovaries"] = 0

    # Follicle Counts
    follicle_l = re.search(r"(?:left ovary|left).*?(\d+)\s*(?:or more)?\s*follicles", lower_text)
    if follicle_l:
        data["follicle_count_left"] = int(follicle_l.group(1))
        
    follicle_r = re.search(r"(?:right ovary|right).*?(\d+)\s*(?:or more)?\s*follicles", lower_text)
    if follicle_r:
        data["follicle_count_right"] = int(follicle_r.group(1))

    # Ovary Volume
    vol_l = re.search(r"(?:left ovary volume|left volume|left ovary).*?(\d+(?:\.\d+)?)\s*(?:cc|ml)", lower_text)
    if vol_l:
        data["ovary_volume_left"] = float(vol_l.group(1))
        
    vol_r = re.search(r"(?:right ovary volume|right volume|right ovary).*?(\d+(?:\.\d+)?)\s*(?:cc|ml)", lower_text)
    if vol_r:
        data["ovary_volume_right"] = float(vol_r.group(1))

    # Fill fallback clinical norms if values aren't in the report text
    if not data["age"]: data["age"] = 25
    if not data["bmi"]: data["bmi"] = 22.0
    if not data["cycle_length"]: data["cycle_length"] = 28
    if not data["lab_lh"]: data["lab_lh"] = 5.0
    if not data["lab_fsh"]: data["lab_fsh"] = 5.5
    if not data["lab_total_testosterone"]: data["lab_total_testosterone"] = 25.0
    if not data["lab_tsh"]: data["lab_tsh"] = 2.0
    if not data["lab_hba1c"]: data["lab_hba1c"] = 5.3
    if not data["lab_fasting_blood_glucose"]: data["lab_fasting_blood_glucose"] = 90.0
    if not data["follicle_count_left"]: data["follicle_count_left"] = 6
    if not data["follicle_count_right"]: data["follicle_count_right"] = 6
    if not data["ovary_volume_left"]: data["ovary_volume_left"] = 6.0
    if not data["ovary_volume_right"]: data["ovary_volume_right"] = 6.0

    return data

def main():
    if not os.path.exists(PCOS_DATA_DIR):
        print(f"[Error] PCOS data directory '{PCOS_DATA_DIR}' does not exist.")
        return

    pdf_files = [f for f in os.listdir(PCOS_DATA_DIR) if f.endswith(".pdf")]
    if not pdf_files:
        print(f"[Warning] No PDF files found in '{PCOS_DATA_DIR}'. Please add reports.")
        return

    print(f"Parsing {len(pdf_files)} PDF reports from: {PCOS_DATA_DIR}")
    
    records = []
    for f in pdf_files:
        full_path = os.path.join(PCOS_DATA_DIR, f)
        text = extract_text_from_pdf(full_path)
        record = parse_clinical_text(f, text)
        records.append(record)
        print(f" - Processed report: {f}")

    # Write to CSV
    with open(OUTPUT_CSV, mode="w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(records)

    print(f"[Success] Structured PCOS training dataset saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()
