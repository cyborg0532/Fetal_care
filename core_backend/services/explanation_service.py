# explanation_service.py — Structured layperson explanation engine translating clinical findings
from typing import Dict, Any, List

class PCOSExplanationService:
    @staticmethod
    def generate_explanation(
        assessment_data: Dict[str, Any], 
        rule_res: Dict[str, Any], 
        ml_res: Dict[str, Any], 
        fusion_score: int, 
        risk_level: str
    ) -> str:
        """
        Synthesizes assessment data, rule engine, and ML scoring into a highly structured,
        readable layperson summary. Adheres to medical safety guidelines (never diagnoses).
        """
        # 1. Summary of findings
        reasons = rule_res.get("reasons", [])
        
        summary = (
            f"Based on your profile, you have a '{risk_level}' risk score of {fusion_score}% "
            "likelihood of having features commonly associated with Polycystic Ovary Syndrome (PCOS).\n\n"
            "**Medical Disclaimer:** This estimates risk factors associated with PCOS and IS NOT a medical diagnosis. "
            "Only a qualified gynecologist or physician can diagnose PCOS through clinical assessments.\n"
        )
        
        # 2. Contributions
        contributions = []
        if reasons:
            contributions.append("### Key Contributing Risk Factors:\n")
            for r in reasons:
                contributions.append(f"- **{r}**")
                
        # 3. Lifestyle Contributions
        lifestyle = []
        sleep = assessment_data.get("sleep_duration", 8.0)
        stress = assessment_data.get("stress_level", "low")
        diet = assessment_data.get("diet_quality", "good")
        exercise = assessment_data.get("exercise_frequency", "sometimes")
        
        if sleep < 6.5 or stress == "high" or diet == "poor" or exercise == "never":
            lifestyle.append("\n### Lifestyle Influences:")
            if sleep < 6.5:
                lifestyle.append("- *Short Sleep Duration:* Sleeping less than 6.5 hours can increase cortisol and decrease insulin sensitivity.")
            if stress == "high":
                lifestyle.append("- *Elevated Stress Levels:* Chronic high stress increases cortisol levels, which can trigger hormonal imbalances.")
            if diet == "poor":
                lifestyle.append("- *Dietary Choices:* A high processed foods or sugars intake can promote insulin resistance.")
            if exercise == "never":
                lifestyle.append("- *Physical Inactivity:* Lacking regular exercise decreases peripheral insulin uptake.")
                
        # 4. Lab Indicators
        labs = []
        tsh = assessment_data.get("lab_tsh")
        testo = assessment_data.get("lab_total_testosterone")
        lh = assessment_data.get("lab_lh")
        fsh = assessment_data.get("lab_fsh")
        
        if (tsh and tsh > 4.5) or (testo and testo > 50) or (lh and fsh and lh/fsh > 2.0):
            labs.append("\n### Lab Parameters Checked:")
            if tsh and tsh > 4.5:
                labs.append(f"- *Elevated TSH ({tsh} uIU/mL):* High thyroid stimulating hormone suggests thyroid sluggishness, which mimics PCOS cycle issues.")
            if testo and testo > 50:
                labs.append(f"- *Elevated Testosterone ({testo} ng/dL):* High male androgen levels are a hallmark indicator of metabolic features of PCOS.")
            if lh and fsh and lh/fsh > 2.0:
                ratio = round(lh/fsh, 2)
                labs.append(f"- *Elevated LH/FSH Ratio ({ratio}):* A ratio greater than 2:1 is common in PCOS and impacts regular ovulation.")

        # 5. Suggested Next Steps
        next_steps = (
            "\n### Suggested Next Steps:\n"
            "1. **Gynecologist Consultation:** Share this assessment summary with your doctor to guide your consult.\n"
            "2. **Hormonal and Blood Panel Evaluation:** Your doctor may order metabolic checks (lipid, fasting insulin, HbA1c).\n"
            "3. **Pelvic Ultrasound:** A pelvic scan can evaluate ovarian follicular morphology."
        )
        
        # Combine all parts
        explanation_body = [summary]
        if contributions:
            explanation_body.append("\n".join(contributions))
        if lifestyle:
            explanation_body.append("\n".join(lifestyle))
        if labs:
            explanation_body.append("\n".join(labs))
        explanation_body.append(next_steps)
        
        return "\n".join(explanation_body)
