import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import DashboardLayout from '../../components/DashboardLayout';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import {
  QuestionCard, ProgressIndicator, YesNoSelector,
  MultiChoiceSelector, NumericInput, ReviewCard
} from '../../components/PCOSComponents';
import { apiFetch } from '../../services/api';

const STRESS_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'High', value: 'high' }
];

const EXERCISE_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: 'Sometimes (1-2x/week)', value: 'sometimes' },
  { label: 'Regular (3+x/week)', value: 'regular' }
];

const DIET_OPTIONS = [
  { label: 'Poor / Fast Food Heavy', value: 'poor' },
  { label: 'Balanced / Average', value: 'average' },
  { label: 'Healthy / Whole Foods', value: 'healthy' }
];

const FREQ_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: 'Sometimes', value: 'sometimes' },
  { label: 'Frequent', value: 'frequent' }
];

const SUGAR_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'High', value: 'high' }
];

const SYMPTOM_LABELS = [
  { key: 'symptom_acne', label: 'Acne / breakouts', emoji: '🧼' },
  { key: 'symptom_excess_facial_hair', label: 'Excess facial or body hair', emoji: '🧔' },
  { key: 'symptom_hair_loss', label: 'Hair thinning or loss', emoji: '💇' },
  { key: 'symptom_weight_gain', label: 'Unexplained weight gain', emoji: '⚖️' },
  { key: 'symptom_difficulty_losing_weight', label: 'Difficulty losing weight', emoji: '🏃‍♀️' },
  { key: 'symptom_difficulty_conceiving', label: 'Difficulty conceiving', emoji: '👶' },
  { key: 'symptom_dark_skin_patches', label: 'Dark patches of skin (neck/armpits)', emoji: '🟤' },
  { key: 'symptom_fatigue', label: 'Chronic fatigue or tiredness', emoji: '🥱' },
  { key: 'symptom_mood_swings', label: 'Frequent mood swings', emoji: '🎭' },
  { key: 'symptom_pelvic_pain', label: 'Pelvic pain (during/outside periods)', emoji: '⚡' },
  { key: 'symptom_sugar_cravings', label: 'Intense sugar or carb cravings', emoji: '🍩' },
];

const getRiskColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'low': return Colors.mint;
    case 'moderate': return Colors.gold;
    case 'high': return '#FF8C42';
    case 'very high': return Colors.danger;
    default: return Colors.primary;
  }
};

const getRiskBg = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'low': return Colors.mintBg;
    case 'moderate': return Colors.goldBg;
    case 'high': return '#FFF0E6';
    case 'very high': return Colors.coralBg;
    default: return Colors.lavenderBg;
  }
};

const LAB_LABELS: Record<string, { label: string; unit: string }> = {
  lab_tsh: { label: "TSH (Thyroid Stimulating Hormone)", unit: "uIU/mL" },
  lab_total_testosterone: { label: "Total Testosterone", unit: "ng/dL" },
  lab_lh: { label: "LH (Luteinizing Hormone)", unit: "mIU/mL" },
  lab_fsh: { label: "FSH (Follicle Stimulating Hormone)", unit: "mIU/mL" },
  lab_hba1c: { label: "HbA1c (Glycated Hemoglobin)", unit: "%" },
  lab_fasting_blood_glucose: { label: "Fasting Blood Glucose", unit: "mg/dL" },
  lab_hdl: { label: "HDL Cholesterol", unit: "mg/dL" },
  lab_ldl: { label: "LDL Cholesterol", unit: "mg/dL" },
  lab_triglycerides: { label: "Triglycerides", unit: "mg/dL" },
  lab_total_cholesterol: { label: "Total Cholesterol", unit: "mg/dL" }
};

export default function PCOSAssessmentScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Navigation steps: 0=Intro, 1=Personal, 2=Menstrual, 3=Symptoms, 4=Lifestyle, 5=Medical, 6=Report Upload, 7=Review, 8=Success
  const [step, setStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);

  // Phase 4 OCR & Medical Report State
  const [isReviewingReport, setIsReviewingReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editLabs, setEditLabs] = useState<Record<string, string>>({});
  const [editUltrasound, setEditUltrasound] = useState<Record<string, boolean>>({
    polycystic_ovary_morphology: false,
    multiple_follicles: false,
    enlarged_ovaries: false,
    normal_ovaries: false,
    no_polycystic_morphology: false
  });

  // Phase 5 Health Hub State variables
  const [assessmentHistory, setAssessmentHistory] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'history'>('dashboard');
  const [isTakingNewAssessment, setIsTakingNewAssessment] = useState(false);
  const [reportConfirmed, setReportConfirmed] = useState(false);

  const fetchHubData = async () => {
    try {
      const hist = await apiFetch('/pcos/history');
      setAssessmentHistory(hist || []);
      if (hist && hist.length > 0) {
        const trends = await apiFetch('/pcos/trends');
        setTrendData(trends);
        setResultData(hist[0]);
      }
    } catch (e) {
      console.error("Failed to load PCOS history:", e);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, [step]);

  const renderMiniChart = (label: string, values: number[], dates: string[], maxVal = 100) => {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{label}</Text>
        <View style={styles.chartBarRow}>
          {values.map((v, idx) => {
            const heightPct = Math.min((v / maxVal) * 100, 100);
            return (
              <View key={idx} style={styles.chartBarCol}>
                <View style={styles.chartBarWrapper}>
                  <View style={[styles.chartBarFill, { height: `${heightPct}%` }]} />
                </View>
                <Text style={styles.chartBarLabel}>{v}</Text>
                <Text style={styles.chartBarDate}>{dates[idx] ? dates[idx].slice(5) : ''}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Load and pre-fill form fields when a report is verified
  useEffect(() => {
    if (reportData) {
      const initialLabs: Record<string, string> = {};
      const norm = reportData.normalized_values || {};
      Object.entries(norm).forEach(([k, v]) => {
        initialLabs[k] = v !== null && v !== undefined ? String(v) : '';
      });
      setEditLabs(initialLabs);

      const initialUltrasound = reportData.ultrasound_findings || {
        polycystic_ovary_morphology: false,
        multiple_follicles: false,
        enlarged_ovaries: false,
        normal_ovaries: false,
        no_polycystic_morphology: false
      };
      setEditUltrasound(initialUltrasound);
    }
  }, [reportData]);

  const selectFile = () => {
    if (Platform.OS === 'web') {
      const existing = document.getElementById('report-file-input');
      if (existing) {
        existing.remove();
      }

      const input = document.createElement('input');
      input.id = 'report-file-input';
      input.type = 'file';
      input.accept = '.pdf,image/*';
      input.style.position = 'absolute';
      input.style.opacity = '0';
      input.style.width = '1px';
      input.style.height = '1px';
      document.body.appendChild(input);

      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          uploadFile(file);
        }
        document.body.removeChild(input);
      };
      input.click();
    } else {
      Alert.alert(
        'Upload Report', 
        'Local mock uploads on native apps run through web interface. Please open in a browser.'
      );
    }
  };

  const uploadFile = async (file: any) => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch('/pcos/report/upload', {
        method: 'POST',
        body: formData,
      });

      setReportData(res);
      setIsReviewingReport(true);
    } catch (e: any) {
      console.error('File upload error:', e);
      setErrorMsg(e.message || 'Failed to parse lab report. Please check file format and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmReport = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        report_id: reportData.id,
        confirmed_values: {}
      };

      if (reportData.report_type === 'ultrasound') {
        payload.ultrasound_findings = editUltrasound;
      } else {
        Object.entries(editLabs).forEach(([k, v]) => {
          if (v !== '') {
            payload.confirmed_values[k] = parseFloat(v);
          }
        });
      }

      const res = await apiFetch('/pcos/report/confirm', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Autofill values on current questionnaire
      if (res.report_type === 'blood_test' && res.normalized_values) {
        const norm = res.normalized_values;
        if (norm.lab_tsh !== undefined && norm.lab_tsh !== null) setLabTsh(String(norm.lab_tsh));
        if (norm.lab_total_testosterone !== undefined && norm.lab_total_testosterone !== null) setLabTestosterone(String(norm.lab_total_testosterone));
        if (norm.lab_lh !== undefined && norm.lab_lh !== null) setLabLh(String(norm.lab_lh));
        if (norm.lab_fsh !== undefined && norm.lab_fsh !== null) setLabFsh(String(norm.lab_fsh));
        if (norm.lab_hba1c !== undefined && norm.lab_hba1c !== null) setLabHba1c(String(norm.lab_hba1c));
        if (norm.lab_fasting_blood_glucose !== undefined && norm.lab_fasting_blood_glucose !== null) setLabFbg(String(norm.lab_fasting_blood_glucose));
        if (norm.lab_hdl !== undefined && norm.lab_hdl !== null) setLabHdl(String(norm.lab_hdl));
        if (norm.lab_ldl !== undefined && norm.lab_ldl !== null) setLabLdl(String(norm.lab_ldl));
        if (norm.lab_triglycerides !== undefined && norm.lab_triglycerides !== null) setLabTriglycerides(String(norm.lab_triglycerides));
        if (norm.lab_total_cholesterol !== undefined && norm.lab_total_cholesterol !== null) setLabCholesterol(String(norm.lab_total_cholesterol));
      }

      setIsReviewingReport(false);
      setReportConfirmed(true);
      setReportData(null);
      
      if (Platform.OS === 'web') {
        alert('Report verified and saved successfully! Your lab entries and latest metrics have updated.');
      } else {
        Alert.alert(
          'Success', 
          'Report values verified and saved successfully! Your lab entries and latest metrics have updated.'
        );
      }
    } catch (e: any) {
      console.error('Confirmation error:', e);
      setErrorMsg(e.message || 'Failed to confirm report parameters.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 1: Personal Info ---
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [tryingToConceive, setTryingToConceive] = useState<boolean | null>(null);
  const [pregnant, setPregnant] = useState<boolean | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);

  // --- Step 2: Menstrual History ---
  const [ageAtFirstPeriod, setAgeAtFirstPeriod] = useState('');
  const [cycleLength, setCycleLength] = useState('');
  const [regularPeriods, setRegularPeriods] = useState<boolean | null>(null);
  const [missedPeriods, setMissedPeriods] = useState<boolean | null>(null);
  const [heavyBleeding, setHeavyBleeding] = useState<boolean | null>(null);
  const [painfulPeriods, setPainfulPeriods] = useState<boolean | null>(null);

  // --- Step 3: Symptoms ---
  const [symptoms, setSymptoms] = useState<Record<string, boolean>>({
    symptom_acne: false,
    symptom_excess_facial_hair: false,
    symptom_hair_loss: false,
    symptom_weight_gain: false,
    symptom_difficulty_losing_weight: false,
    symptom_difficulty_conceiving: false,
    symptom_dark_skin_patches: false,
    symptom_fatigue: false,
    symptom_mood_swings: false,
    symptom_sleep_problems: false,
    symptom_irregular_periods: false,
    symptom_pelvic_pain: false,
    symptom_bloating: false,
    symptom_sugar_cravings: false,
  });

  // --- Step 4: Lifestyle ---
  const [sleepDuration, setSleepDuration] = useState('');
  const [stressLevel, setStressLevel] = useState('moderate');
  const [exerciseFrequency, setExerciseFrequency] = useState('sometimes');
  const [dietQuality, setDietQuality] = useState('average');
  const [waterIntake, setWaterIntake] = useState('');
  const [smoking, setSmoking] = useState('no');
  const [alcohol, setAlcohol] = useState('no');
  const [fastFoodFrequency, setFastFoodFrequency] = useState('sometimes');
  const [processedFoodFrequency, setProcessedFoodFrequency] = useState('sometimes');
  const [sugarIntake, setSugarIntake] = useState('moderate');

  // --- Step 5: Medical History (Optional) ---
  const [diagnosedPcos, setDiagnosedPcos] = useState<boolean | null>(null);
  const [familyHistoryPcos, setFamilyHistoryPcos] = useState<boolean | null>(null);
  const [diabetesPrediabetes, setDiabetesPrediabetes] = useState<boolean | null>(null);
  const [thyroidDisorder, setThyroidDisorder] = useState<boolean | null>(null);
  const [hormonalMedication, setHormonalMedication] = useState<boolean | null>(null);
  const [tryingLonger12Months, setTryingLonger12Months] = useState<boolean | null>(null);

  // --- Step 6: Lab values (Optional) ---
  const [labTsh, setLabTsh] = useState('');
  const [labTestosterone, setLabTestosterone] = useState('');
  const [labLh, setLabLh] = useState('');
  const [labFsh, setLabFsh] = useState('');
  const [labHba1c, setLabHba1c] = useState('');
  const [labFbg, setLabFbg] = useState('');
  const [labHdl, setLabHdl] = useState('');
  const [labLdl, setLabLdl] = useState('');
  const [labTriglycerides, setLabTriglycerides] = useState('');
  const [labCholesterol, setLabCholesterol] = useState('');

  // Live BMI calculation
  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      const computed = w / ((h / 100) ** 2);
      setBmi(parseFloat(computed.toFixed(2)));
    } else {
      setBmi(null);
    }
  }, [height, weight]);

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      const ageVal = parseInt(age);
      if (isNaN(ageVal) || ageVal < 10 || ageVal > 90) {
        newErrors.age = 'Age must be between 10 and 90';
      }
      const hVal = parseFloat(height);
      if (isNaN(hVal) || hVal < 50 || hVal > 250) {
        newErrors.height = 'Height must be between 50 and 250 cm';
      }
      const wVal = parseFloat(weight);
      if (isNaN(wVal) || wVal < 20 || wVal > 300) {
        newErrors.weight = 'Weight must be between 20 and 300 kg';
      }
      if (tryingToConceive === null) {
        newErrors.tryingToConceive = 'Please select an option';
      }
    }

    if (currentStep === 2) {
      const len = parseInt(cycleLength);
      if (isNaN(len) || len < 10 || len > 150) {
        newErrors.cycleLength = 'Please enter a valid cycle length (10 - 150 days)';
      }
      if (regularPeriods === null) newErrors.regularPeriods = 'Please select an option';
      if (missedPeriods === null) newErrors.missedPeriods = 'Please select an option';
    }

    if (currentStep === 4) {
      const sleep = parseFloat(sleepDuration);
      if (isNaN(sleep) || sleep <= 0 || sleep > 24) {
        newErrors.sleepDuration = 'Please enter valid hours (0 - 24)';
      }
      const water = parseFloat(waterIntake);
      if (isNaN(water) || water < 0 || water > 40) {
        newErrors.waterIntake = 'Please enter a valid number (e.g. 0 - 20 glasses)';
      }
    }

    if (currentStep === 6) {
      if (!reportConfirmed) {
        newErrors.report = 'You must upload and verify your medical report to proceed.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (isEditing) {
        setStep(7);
        setIsEditing(false);
      } else {
        setStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (isEditing) {
      setStep(7);
      setIsEditing(false);
    } else {
      setStep(prev => Math.max(0, prev - 1));
    }
  };

  const handleSkip = () => {
    if (step === 5) {
      // Clear optional medical inputs
      setDiagnosedPcos(null);
      setFamilyHistoryPcos(null);
      setDiabetesPrediabetes(null);
      setThyroidDisorder(null);
      setHormonalMedication(null);
      setTryingLonger12Months(null);
      setStep(prev => prev + 1);
    }
  };

  const triggerEdit = (targetStep: number) => {
    setIsEditing(true);
    setStep(targetStep);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    const payload = {
      age: parseInt(age),
      height: parseFloat(height),
      weight: parseFloat(weight),
      trying_to_conceive: tryingToConceive,
      pregnant: false, // Streamlined fallback

      age_at_first_period: 12, // Streamlined fallback
      cycle_length: parseInt(cycleLength),
      regular_periods: regularPeriods,
      missed_periods: missedPeriods,
      heavy_bleeding: false, // Streamlined fallback
      painful_periods: false, // Streamlined fallback

      ...symptoms,

      sleep_duration: parseFloat(sleepDuration),
      stress_level: stressLevel,
      exercise_frequency: exerciseFrequency,
      diet_quality: dietQuality,
      water_intake: parseFloat(waterIntake),
      smoking: smoking,
      alcohol: 'no', // Streamlined fallback
      fast_food_frequency: 'sometimes', // Streamlined fallback
      processed_food_frequency: 'sometimes', // Streamlined fallback
      sugar_intake: sugarIntake,

      diagnosed_pcos: diagnosedPcos,
      family_history_pcos: familyHistoryPcos,
      diabetes_prediabetes: diabetesPrediabetes,
      thyroid_disorder: thyroidDisorder,
      hormonal_medication: hormonalMedication,
      trying_longer_12_months: tryingLonger12Months,

      lab_tsh: labTsh !== '' ? parseFloat(labTsh) : null,
      lab_total_testosterone: labTestosterone !== '' ? parseFloat(labTestosterone) : null,
      lab_lh: labLh !== '' ? parseFloat(labLh) : null,
      lab_fsh: labFsh !== '' ? parseFloat(labFsh) : null,
      lab_hba1c: labHba1c !== '' ? parseFloat(labHba1c) : null,
      lab_fasting_blood_glucose: labFbg !== '' ? parseFloat(labFbg) : null,
      lab_hdl: labHdl !== '' ? parseFloat(labHdl) : null,
      lab_ldl: labLdl !== '' ? parseFloat(labLdl) : null,
      lab_triglycerides: labTriglycerides !== '' ? parseFloat(labTriglycerides) : null,
      lab_total_cholesterol: labCholesterol !== '' ? parseFloat(labCholesterol) : null,

      ultrasound_report_url: null,
      status: 'completed'
    };

    try {
      const res = await apiFetch('/pcos/assessment', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResultData(res);
      setIsTakingNewAssessment(false);
      fetchHubData();
      setStep(8);
    } catch (e: any) {
      console.error('PCOS submit error:', e);
      setErrorMsg(e.message || 'Submission failed. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const restartAssessment = () => {
    setResultData(null);
    setStep(0);
    setIsEditing(false);
    setReportConfirmed(false);
    setAge('');
    setHeight('');
    setWeight('');
    setTryingToConceive(null);
    setPregnant(null);
    setAgeAtFirstPeriod('');
    setCycleLength('');
    setRegularPeriods(null);
    setMissedPeriods(null);
    setHeavyBleeding(null);
    setPainfulPeriods(null);
    setSymptoms({
      symptom_acne: false,
      symptom_excess_facial_hair: false,
      symptom_hair_loss: false,
      symptom_weight_gain: false,
      symptom_difficulty_losing_weight: false,
      symptom_difficulty_conceiving: false,
      symptom_dark_skin_patches: false,
      symptom_fatigue: false,
      symptom_mood_swings: false,
      symptom_pelvic_pain: false,
      symptom_sugar_cravings: false,
    });
    setSleepDuration('');
    setStressLevel('moderate');
    setExerciseFrequency('sometimes');
    setDietQuality('average');
    setWaterIntake('');
    setSmoking('no');
    setAlcohol('no');
    setFastFoodFrequency('sometimes');
    setProcessedFoodFrequency('sometimes');
    setSugarIntake('moderate');
    setDiagnosedPcos(null);
    setFamilyHistoryPcos(null);
    setDiabetesPrediabetes(null);
    setThyroidDisorder(null);
    setHormonalMedication(null);
    setTryingLonger12Months(null);
    setLabTsh('');
    setLabTestosterone('');
    setLabLh('');
    setLabFsh('');
    setLabHba1c('');
    setLabFbg('');
    setLabHdl('');
    setLabLdl('');
    setLabTriglycerides('');
    setLabCholesterol('');
    setErrorMsg(null);
  };

  const showHub = !isTakingNewAssessment && assessmentHistory.length > 0 && step === 0 && !isReviewingReport;

  return (
    <DashboardLayout title="PCOS Assessment">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {isReviewingReport && reportData ? (
          /* --- PHASE 4: REPORT REVIEW OVERLAY --- */
          <View style={styles.reviewOverlayContainer}>
            <Text style={styles.reviewTitle}>Review Report Findings</Text>
            <Text style={styles.reviewSubtitle}>
              Please verify and edit the parameters extracted from your {reportData.report_type === 'ultrasound' ? 'Ultrasound' : 'Blood Lab'} report.
            </Text>

            {reportData.report_type === 'ultrasound' ? (
              <View style={styles.card}>
                <Text style={styles.sectionHeader}>Ultrasound Findings</Text>
                {Object.entries(editUltrasound).map(([k, v]) => (
                  <View key={k} style={styles.switchRow}>
                    <Text style={styles.switchLabel}>
                      {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Text>
                    <TouchableOpacity
                      style={[styles.selectorBtn, v ? styles.selectorBtnActive : null]}
                      onPress={() => setEditUltrasound(prev => ({ ...prev, [k]: !prev[k] }))}
                    >
                      <Text style={[styles.selectorBtnText, v ? styles.selectorBtnTextActive : null]}>
                        {v ? 'Yes' : 'No'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionHeader}>Lab & Hormone Values</Text>
                {Object.entries(LAB_LABELS).map(([key, info]) => {
                  const val = editLabs[key];
                  const confidence = reportData.confidence_scores?.[key] || 0;
                  const isLowConfidence = confidence > 0 && confidence < 70;

                  if (val === undefined || val === '') return null;

                  return (
                    <View key={key} style={[styles.reviewRow, isLowConfidence ? styles.lowConfidenceRow : null]}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.reviewRowLabel}>{info.label}</Text>
                        <Text style={styles.confidenceText}>
                          Confidence: {confidence}% {isLowConfidence && '⚠️ Low Confidence'}
                        </Text>
                      </View>
                      
                      <View style={[styles.reviewInputCol, { flex: 1.2 }]}>
                        <NumericInput
                          value={val}
                          onChangeText={(text) => setEditLabs(prev => ({ ...prev, [key]: text }))}
                          placeholder="Value"
                        />
                        <Text style={styles.unitText}>{info.unit}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => setEditLabs(prev => ({ ...prev, [key]: '' }))}
                      >
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                <View style={styles.addTestContainer}>
                  <Text style={styles.fieldLabel}>Add Missing Test</Text>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: 6 }}>
                    {Object.entries(LAB_LABELS).map(([key, info]) => {
                      if (editLabs[key] !== undefined && editLabs[key] !== '') return null;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={styles.addTestBadge}
                          onPress={() => setEditLabs(prev => ({ ...prev, [key]: '0.0' }))}
                        >
                          <Text style={styles.addTestBadgeText}>+ {key.replace('lab_', '').replace('_', ' ').toUpperCase()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            )}

            <View style={styles.navButtonsRow}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => {
                  setIsReviewingReport(false);
                  setReportData(null);
                }}
              >
                <Text style={styles.btnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1.5 }]}
                onPress={handleConfirmReport}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnTextPrimary}>Confirm & Sync Results</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : showHub && resultData ? (
          /* --- PHASE 5: PREMIUM PCOS HEALTH HUB --- */
          <View style={styles.hubContainer}>
            <Text style={styles.hubTitle}>PCOS Health Hub</Text>
            <Text style={styles.hubSubtitle}>
              Monitor, track, and manage your lifestyle indicators and risk profile
            </Text>

            {/* Sub-tab selection row */}
            <View style={styles.subTabRow}>
              {(['dashboard', 'history'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.subTabBtn, activeSubTab === tab ? styles.subTabBtnActive : null]}
                  onPress={() => setActiveSubTab(tab)}
                >
                  <Text style={[styles.subTabBtnText, activeSubTab === tab ? styles.subTabBtnTextActive : null]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Render active sub-tab content */}
            {activeSubTab === 'dashboard' && (
              <View>
                {/* 1. Overall Score Card */}
                <View style={styles.hubCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardHeader}>Assessment Results</Text>
                    <Text style={styles.cardDate}>
                      {resultData.created_at ? new Date(resultData.created_at).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  
                  <View style={styles.scoreMetricRow}>
                    <View style={styles.scoreCircle}>
                      <Text style={styles.scoreLargeText}>{resultData.risk_percentage}%</Text>
                      <Text style={styles.scoreSubText}>Risk</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.metricLabel}>Risk Level:</Text>
                        <View style={[styles.badge, { backgroundColor: getRiskBg(resultData.risk_level) }]}>
                          <Text style={[styles.badgeText, { color: getRiskColor(resultData.risk_level), fontSize: 11 }]}>
                            {resultData.risk_level}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.metricLabelSub}>
                        Evaluation: {resultData.prediction_source || 'Rule-Based Engine'}
                      </Text>
                      <Text style={styles.metricLabelSub}>
                        Confidence: {resultData.confidence || 'Moderate'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.disclaimerBox}>
                    <Text style={styles.disclaimerTitle}>⚠️ Medical Disclaimer</Text>
                    <Text style={styles.disclaimerText}>
                      This assessment estimates risk factors associated with PCOS. It is not a medical diagnosis. 
                      Please consult a qualified gynecologist for professional medical evaluation.
                    </Text>
                  </View>
                </View>

                {/* 2. AI Explanation Summary */}
                <View style={styles.hubCard}>
                  <Text style={styles.cardHeader}>AI Explanation Summary</Text>
                  <Text style={styles.explanationBodyText}>{resultData.explanation}</Text>
                </View>

                {/* 3. Personalized Recommendation Cards */}
                <View style={styles.recSplitGrid}>
                  {/* Diet Recommendations */}
                  <View style={[styles.hubCard, { flex: 1, minWidth: 280 }]}>
                    <Text style={styles.cardHeader}>🥦 Personalized Nutrition</Text>
                    <Text style={styles.dietSubHeader}>Meal Recommendations:</Text>
                    {resultData.diet_recommendations?.meals && (
                      <View style={{ gap: Spacing.sm }}>
                        <View>
                          <Text style={styles.mealName}>Breakfast:</Text>
                          <Text style={styles.mealDesc}>
                            {resultData.diet_recommendations.meals.breakfast?.[0]?.name} - {resultData.diet_recommendations.meals.breakfast?.[0]?.desc}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.mealName}>Lunch:</Text>
                          <Text style={styles.mealDesc}>
                            {resultData.diet_recommendations.meals.lunch?.[0]?.name} - {resultData.diet_recommendations.meals.lunch?.[0]?.desc}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.mealName}>Dinner:</Text>
                          <Text style={styles.mealDesc}>
                            {resultData.diet_recommendations.meals.dinner?.[0]?.name} - {resultData.diet_recommendations.meals.dinner?.[0]?.desc}
                          </Text>
                        </View>
                      </View>
                    )}
                    <Text style={styles.dietSubHeader}>Nutrition Tips:</Text>
                    {resultData.diet_recommendations?.nutrition_tips?.map((tip: string, idx: number) => (
                      <Text key={idx} style={styles.bulletItem}>• {tip}</Text>
                    ))}
                  </View>

                  {/* Exercise Recommendations */}
                  <View style={[styles.hubCard, { flex: 1, minWidth: 280 }]}>
                    <Text style={styles.cardHeader}>🏃‍♀️ Fitness & Workouts</Text>
                    <Text style={styles.bulletItem}>**Routine:** {resultData.exercise_recommendations?.frequency}</Text>
                    <Text style={styles.bulletItem}>**Duration:** {resultData.exercise_recommendations?.duration}</Text>
                    <Text style={styles.bulletItem}>**Intensity:** {resultData.exercise_recommendations?.intensity}</Text>
                    <Text style={styles.bulletItem}>**Rest Days:** {resultData.exercise_recommendations?.rest_days}</Text>
                    <Text style={styles.dietSubHeader}>Suggested Workouts:</Text>
                    {resultData.exercise_recommendations?.suggested_workouts?.map((ex: string, idx: number) => (
                      <Text key={idx} style={styles.bulletItem}>• {ex}</Text>
                    ))}
                    <Text style={styles.safetyNote}>{resultData.exercise_recommendations?.safety_note}</Text>
                  </View>
                </View>

                {/* 4. Followups & Reminders */}
                <View style={styles.hubCard}>
                  <Text style={styles.cardHeader}>🔔 Follow-ups & Reminders</Text>
                  {resultData.reminders?.actions?.map((act: string, idx: number) => (
                    <View key={idx} style={styles.reminderRowInline}>
                      <Text style={{ fontSize: 16 }}>📌</Text>
                      <Text style={styles.reminderTextInline}>{act}</Text>
                    </View>
                  ))}
                </View>

                {/* Dashboard Quick Actions */}
                <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                  <TouchableOpacity
                    style={[styles.btnPrimary, { flex: 1 }]}
                    onPress={() => {
                      setIsTakingNewAssessment(true);
                      setStep(0);
                    }}
                  >
                    <Text style={styles.btnTextPrimary}>Take New Assessment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeSubTab === 'history' && (
              <View>
                {/* Custom CSS charts */}
                {trendData && trendData.dates?.length > 1 ? (
                  <View style={styles.hubCard}>
                    <Text style={styles.cardHeader}>Progress Tracking Trends</Text>
                    {renderMiniChart("Risk Percentage Trend", trendData.risk_scores, trendData.dates, 100)}
                    {renderMiniChart("BMI Trend", trendData.bmis, trendData.dates, 40)}
                    {renderMiniChart("Weight Trend (kg)", trendData.weights, trendData.dates, 150)}
                  </View>
                ) : (
                  <View style={styles.hubCard}>
                    <Text style={styles.cardHeader}>Progress Trends</Text>
                    <Text style={styles.emptyStateText}>Complete multiple assessments over time to generate tracking charts.</Text>
                  </View>
                )}

                {/* Historical list */}
                <View style={styles.hubCard}>
                  <Text style={styles.cardHeader}>Assessment Log</Text>
                  {assessmentHistory.map((item, idx) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.historyRow, resultData.id === item.id ? styles.historyRowSelected : null]}
                      onPress={() => setResultData(item)}
                    >
                      <View>
                        <Text style={styles.historyDate}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                        <Text style={styles.historyDetails}>
                          BMI: {item.bmi} | Source: {item.prediction_source}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                        <View style={[styles.badge, { backgroundColor: getRiskBg(item.risk_level) }]}>
                          <Text style={[styles.badgeText, { color: getRiskColor(item.risk_level), fontSize: 11 }]}>
                            {item.risk_percentage}%
                          </Text>
                        </View>
                        {resultData.id === item.id && <Text style={{ color: Colors.primary, fontSize: 11 }}>✓ Active</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* --- STEP 0: Introduction --- */}
            {step === 0 && (
              <View style={styles.introContainer}>
                <View style={styles.headerIcon}>
                  <Text style={{ fontSize: 56 }}>🌸</Text>
                </View>
                <Text style={styles.introTitle}>PCOS Risk Assessment</Text>
                <Text style={styles.introSubtitle}>
                  Polycystic Ovary Syndrome (PCOS) is a common hormonal disorder affecting reproductive-aged women.
                  This assessment evaluates your risk factors based on symptoms, menstrual history, and lifestyle indicators.
                </Text>

                <View style={styles.disclaimerBox}>
                  <Text style={styles.disclaimerTitle}>⚠️ Medical Disclaimer</Text>
                  <Text style={styles.disclaimerText}>
                    This assessment estimates risk factors associated with PCOS. It is not a medical diagnosis.
                    Always seek the advice of your physician or other qualified health providers with any questions you may have regarding a medical condition.
                  </Text>
                </View>

                <View style={styles.uploadReportCard}>
                  <Text style={styles.uploadReportCardTitle}>🌸 Autofill Labs via OCR</Text>
                  <Text style={styles.uploadReportCardText}>
                    Upload your medical report image or PDF (blood panel, thyroid, hormones) to automatically extract values.
                  </Text>
                  <TouchableOpacity 
                    style={[styles.btnSecondary, { marginTop: Spacing.sm }]} 
                    onPress={selectFile}
                    disabled={isUploading}
                  >
                    <Text style={styles.btnTextSecondary}>
                      {isUploading ? 'Uploading & Processing...' : 'Upload Medical Report'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.btnPrimary} onPress={handleNext}>
                  <Text style={styles.btnTextPrimary}>Start Assessment</Text>
                </TouchableOpacity>
              </View>
            )}

        {/* Survey screens */}
        {step >= 1 && step <= 7 && (
          <View style={styles.formContainer}>
            <ProgressIndicator currentStep={step} totalSteps={7} />

            {/* --- STEP 1: Personal Information --- */}
            {step === 1 && (
              <View>
                <QuestionCard title="Personal Information" description="Provide your general body dimensions and status">
                  <Text style={styles.fieldLabel}>Age</Text>
                  <NumericInput
                    value={age}
                    onChangeText={setAge}
                    placeholder="Enter age (e.g. 26)"
                    unit="years"
                    validationError={errors.age}
                  />

                  <Text style={styles.fieldLabel}>Height</Text>
                  <NumericInput
                    value={height}
                    onChangeText={setHeight}
                    placeholder="Enter height (e.g. 165)"
                    unit="cm"
                    validationError={errors.height}
                  />

                  <Text style={styles.fieldLabel}>Weight</Text>
                  <NumericInput
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="Enter weight (e.g. 68)"
                    unit="kg"
                    validationError={errors.weight}
                  />

                  {bmi !== null && (
                    <View style={styles.bmiDisplay}>
                      <Text style={styles.bmiLabel}>Computed BMI:</Text>
                      <Text style={styles.bmiValue}>{bmi}</Text>
                    </View>
                  )}

                  <Text style={styles.fieldLabel}>Are you trying to conceive?</Text>
                  <YesNoSelector value={tryingToConceive} onChange={setTryingToConceive} />
                  {errors.tryingToConceive && <Text style={styles.errorText}>⚠️ {errors.tryingToConceive}</Text>}
                </QuestionCard>
              </View>
            )}

            {/* --- STEP 2: Menstrual History --- */}
            {step === 2 && (
              <View>
                <QuestionCard title="Menstrual History" description="Tell us about your cycles">
                  <Text style={styles.fieldLabel}>Cycle Length (average days between periods)</Text>
                  <NumericInput
                    value={cycleLength}
                    onChangeText={setCycleLength}
                    placeholder="e.g. 28"
                    unit="days"
                    validationError={errors.cycleLength}
                  />

                  <Text style={styles.fieldLabel}>Are your periods regular?</Text>
                  <YesNoSelector value={regularPeriods} onChange={setRegularPeriods} />
                  {errors.regularPeriods && <Text style={styles.errorText}>⚠️ {errors.regularPeriods}</Text>}

                  <Text style={styles.fieldLabel}>Do you regularly miss periods?</Text>
                  <YesNoSelector value={missedPeriods} onChange={setMissedPeriods} />
                  {errors.missedPeriods && <Text style={styles.errorText}>⚠️ {errors.missedPeriods}</Text>}
                </QuestionCard>
              </View>
            )}

            {/* --- STEP 3: Symptoms Survey --- */}
            {step === 3 && (
              <View>
                <QuestionCard title="Symptoms Survey" description="Select all physical symptoms you have regularly experienced (select all that apply)">
                  <View style={styles.symptomsList}>
                    {SYMPTOM_LABELS.map((item) => {
                      const isActive = symptoms[item.key] === true;
                      return (
                        <TouchableOpacity
                           key={item.key}
                           style={[
                             styles.symptomRow,
                             isActive && styles.symptomRowActive
                           ]}
                           onPress={() => {
                             setSymptoms(prev => ({
                               ...prev,
                               [item.key]: !prev[item.key]
                             }));
                           }}
                           activeOpacity={0.7}
                        >
                          <Text style={styles.symptomEmoji}>{item.emoji}</Text>
                          <Text style={[styles.symptomText, isActive && styles.symptomTextActive]}>
                            {item.label}
                          </Text>
                          <View style={[styles.checkboxCircle, isActive && styles.checkboxCircleActive]}>
                            {isActive && <Text style={styles.checkmarkIcon}>✓</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </QuestionCard>
              </View>
            )}

            {/* --- STEP 4: Lifestyle Survey --- */}
            {step === 4 && (
              <View>
                <QuestionCard title="Lifestyle Indicators" description="Your daily habits play a significant role in managing endocrine levels">
                  <Text style={styles.fieldLabel}>Sleep Duration</Text>
                  <NumericInput
                    value={sleepDuration}
                    onChangeText={setSleepDuration}
                    placeholder="Average hours of sleep per night (e.g. 7.5)"
                    unit="hours"
                    validationError={errors.sleepDuration}
                  />

                  <Text style={styles.fieldLabel}>Stress Levels</Text>
                  <MultiChoiceSelector
                    options={STRESS_OPTIONS}
                    selectedValue={stressLevel}
                    onChange={setStressLevel}
                  />

                  <Text style={styles.fieldLabel}>Exercise Frequency</Text>
                  <MultiChoiceSelector
                    options={EXERCISE_OPTIONS}
                    selectedValue={exerciseFrequency}
                    onChange={setExerciseFrequency}
                  />

                  <Text style={styles.fieldLabel}>Diet Quality</Text>
                  <MultiChoiceSelector
                    options={DIET_OPTIONS}
                    selectedValue={dietQuality}
                    onChange={setDietQuality}
                  />

                  <Text style={styles.fieldLabel}>Water Intake</Text>
                  <NumericInput
                    value={waterIntake}
                    onChangeText={setWaterIntake}
                    placeholder="Enter glasses of water daily (e.g. 8)"
                    unit="glasses"
                    validationError={errors.waterIntake}
                  />

                  <Text style={styles.fieldLabel}>Do you smoke?</Text>
                  <MultiChoiceSelector
                    options={[{ label: 'No', value: 'no' }, { label: 'Yes', value: 'yes' }]}
                    selectedValue={smoking}
                    onChange={setSmoking}
                  />
                </QuestionCard>
              </View>
            )}

            {/* --- STEP 5: Quick Medical History (Optional) --- */}
            {step === 5 && (
              <View>
                <QuestionCard
                  title="Medical History (Optional)"
                  description="Answering these questions improves assessment accuracy. You may skip this section."
                >
                  <Text style={styles.fieldLabel}>Have you ever been diagnosed with PCOS?</Text>
                  <YesNoSelector value={diagnosedPcos} onChange={setDiagnosedPcos} />

                  <Text style={styles.fieldLabel}>Has a mother or sister been diagnosed with PCOS?</Text>
                  <YesNoSelector value={familyHistoryPcos} onChange={setFamilyHistoryPcos} />

                  <Text style={styles.fieldLabel}>Have you been diagnosed with Diabetes or Prediabetes?</Text>
                  <YesNoSelector value={diabetesPrediabetes} onChange={setDiabetesPrediabetes} />

                  <Text style={styles.fieldLabel}>Do you have a thyroid disorder?</Text>
                  <YesNoSelector value={thyroidDisorder} onChange={setThyroidDisorder} />

                  <Text style={styles.fieldLabel}>Are you taking hormonal medication (e.g. birth control)?</Text>
                  <YesNoSelector value={hormonalMedication} onChange={setHormonalMedication} />

                  {tryingToConceive === true && (
                    <>
                      <Text style={styles.fieldLabel}>Have you been trying to conceive for longer than 12 months?</Text>
                      <YesNoSelector value={tryingLonger12Months} onChange={setTryingLonger12Months} />
                    </>
                  )}
                </QuestionCard>
              </View>
            )}

            {/* --- STEP 6: Mandatory Medical Report Upload --- */}
            {step === 6 && (
              <View>
                <QuestionCard
                  title="Medical Report Upload"
                  description="Please upload either a recent Blood Lab report panel or an Ultrasound report. This information is required for the hybrid PCOS assessment."
                >
                  <View style={styles.uploadReportCardInline}>
                    <Text style={styles.uploadReportCardTitleInline}>🌸 Upload Medical Report (Blood Test or Ultrasound)</Text>
                    <Text style={styles.uploadReportCardTextInline}>
                      We will automatically extract hormone levels, TSH, fasting glucose, or ovarian morphology.
                    </Text>
                    <TouchableOpacity 
                      style={[styles.btnSecondary, { marginTop: Spacing.sm }]} 
                      onPress={selectFile}
                      disabled={isUploading}
                    >
                      <Text style={styles.btnTextSecondary}>
                        {isUploading ? 'Processing OCR & Extracting...' : 'Select PDF or Image'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {reportConfirmed ? (
                    <View style={{
                      backgroundColor: '#EBFBEF',
                      borderColor: '#D0F5D9',
                      borderWidth: 1,
                      borderRadius: Radius.md,
                      padding: Spacing.md,
                      marginTop: Spacing.md,
                      alignItems: 'center'
                    }}>
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>✓</Text>
                      <Text style={{ fontWeight: 'bold', color: '#1E7E34', fontSize: 16 }}>Medical Report Verified</Text>
                      <Text style={{ color: '#28A745', textAlign: 'center', fontSize: 13, marginTop: 4 }}>
                        Your clinical parameters and findings have been successfully synced to the screening wizard. You can now proceed.
                      </Text>
                    </View>
                  ) : (
                    <View style={{
                      backgroundColor: '#FFF0F0',
                      borderColor: '#FFD2D2',
                      borderWidth: 1,
                      borderRadius: Radius.md,
                      padding: Spacing.md,
                      marginTop: Spacing.md,
                      alignItems: 'center'
                    }}>
                      <Text style={{ fontSize: 13, color: '#C82333', textAlign: 'center' }}>
                        ⚠️ A verified medical report is required. Please upload your report to proceed.
                      </Text>
                    </View>
                  )}
                  {errors.report && <Text style={[styles.errorText, { marginTop: 8 }]}>⚠️ {errors.report}</Text>}
                </QuestionCard>
              </View>
            )}

            {/* --- STEP 7: Review & Submit --- */}
            {step === 7 && (
              <View>
                <Text style={styles.sectionHeader}>Review Your Answers</Text>
                <Text style={styles.sectionSubtitle}>Please confirm the information below before submitting.</Text>

                <ReviewCard
                  title="Personal Information"
                  items={[
                    { label: 'Age', value: age },
                    { label: 'Height', value: `${height} cm` },
                    { label: 'Weight', value: `${weight} kg` },
                    { label: 'Computed BMI', value: bmi },
                    { label: 'Trying to Conceive', value: tryingToConceive },
                  ]}
                  onEditPress={() => triggerEdit(1)}
                />

                <ReviewCard
                  title="Menstrual History"
                  items={[
                    { label: 'Average cycle length', value: `${cycleLength} days` },
                    { label: 'Regular periods', value: regularPeriods },
                    { label: 'Missed periods', value: missedPeriods },
                  ]}
                  onEditPress={() => triggerEdit(2)}
                />

                <ReviewCard
                  title="Symptoms Selected"
                  items={SYMPTOM_LABELS.map(s => ({
                    label: s.label,
                    value: symptoms[s.key]
                  }))}
                  onEditPress={() => triggerEdit(3)}
                />

                <ReviewCard
                  title="Lifestyle Factors"
                  items={[
                    { label: 'Sleep hours', value: sleepDuration },
                    { label: 'Stress level', value: stressLevel },
                    { label: 'Exercise frequency', value: exerciseFrequency },
                    { label: 'Diet quality', value: dietQuality },
                    { label: 'Water intake', value: `${waterIntake} glasses` },
                    { label: 'Smoking', value: smoking },
                  ]}
                  onEditPress={() => triggerEdit(4)}
                />

                <ReviewCard
                  title="Medical History"
                  items={[
                    { label: 'Diagnosed with PCOS', value: diagnosedPcos },
                    { label: 'Family history of PCOS', value: familyHistoryPcos },
                    { label: 'Diabetes or Prediabetes', value: diabetesPrediabetes },
                    { label: 'Thyroid disorder', value: thyroidDisorder },
                    { label: 'Hormonal medication', value: hormonalMedication },
                    { label: 'Trying >12 months', value: tryingLonger12Months },
                  ]}
                  onEditPress={() => triggerEdit(5)}
                />

                <ReviewCard
                  title="Lab values"
                  items={[
                    { label: 'TSH', value: labTsh ? `${labTsh} µIU/mL` : null },
                    { label: 'Total Testosterone', value: labTestosterone ? `${labTestosterone} ng/dL` : null },
                    { label: 'LH', value: labLh ? `${labLh} mIU/mL` : null },
                    { label: 'FSH', value: labFsh ? `${labFsh} mIU/mL` : null },
                    { label: 'HbA1c', value: labHba1c ? `${labHba1c} %` : null },
                    { label: 'Fasting Blood Glucose', value: labFbg ? `${labFbg} mg/dL` : null },
                    { label: 'HDL', value: labHdl ? `${labHdl} mg/dL` : null },
                    { label: 'LDL', value: labLdl ? `${labLdl} mg/dL` : null },
                    { label: 'Triglycerides', value: labTriglycerides ? `${labTriglycerides} mg/dL` : null },
                    { label: 'Total Cholesterol', value: labCholesterol ? `${labCholesterol} mg/dL` : null },
                  ]}
                  onEditPress={() => triggerEdit(6)}
                />

                {errorMsg && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{errorMsg}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Navigation Buttons Row */}
            <View style={styles.navButtonsRow}>
              {step > 1 && (
                <TouchableOpacity style={styles.btnSecondary} onPress={handleBack}>
                  <Text style={styles.btnTextSecondary}>Back</Text>
                </TouchableOpacity>
              )}

              {step === 5 ? (
                <>
                  <TouchableOpacity style={styles.btnSecondary} onPress={handleSkip}>
                    <Text style={styles.btnTextSecondary}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnPrimary, { flex: 1.5 }]} onPress={handleNext}>
                    <Text style={styles.btnTextPrimary}>Next</Text>
                  </TouchableOpacity>
                </>
              ) : (
                step < 7 && (
                  <TouchableOpacity 
                    style={[
                      styles.btnPrimary, 
                      { flex: 2 },
                      (step === 6 && !reportConfirmed) && { backgroundColor: '#CCCCCC', opacity: 0.6 }
                    ]} 
                    onPress={handleNext}
                    disabled={step === 6 && !reportConfirmed}
                  >
                    <Text style={styles.btnTextPrimary}>
                      {step === 6 && !reportConfirmed ? 'Upload Report to Proceed' : 'Next'}
                    </Text>
                  </TouchableOpacity>
                )
              )}

              {step === 7 && (
                <TouchableOpacity
                  style={[styles.btnPrimary, { flex: 2, backgroundColor: Colors.primary }]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.btnTextPrimary}>Submit Assessment</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* --- STEP 8: Success screen --- */}
        {step === 8 && (
          <View style={styles.successContainer}>
            <View style={styles.successCircle}>
              <Text style={{ fontSize: 60 }}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Assessment Complete!</Text>
            <Text style={styles.successSubtitle}>
              Your screening has been evaluated using our hybrid clinical assessment system.
            </Text>

            {resultData && (
              <View style={styles.resultCard}>
                {/* Score & Risk Meter */}
                <View style={styles.resultHeaderRow}>
                  <View style={[styles.percentageCircle, { borderColor: getRiskColor(resultData.risk_level) }]}>
                    <Text style={[styles.percentageText, { color: getRiskColor(resultData.risk_level) }]}>
                      {resultData.risk_percentage}%
                    </Text>
                    <Text style={styles.percentageSub}>risk</Text>
                  </View>
                  <View style={styles.resultMeta}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: getRiskBg(resultData.risk_level) }]}>
                        <Text style={[styles.badgeText, { color: getRiskColor(resultData.risk_level) }]}>
                          {resultData.risk_level} Risk
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: resultData.confidence === 'Hybrid AI' ? '#EBF5FF' : Colors.lavenderBg }]}>
                        <Text style={[styles.badgeText, { color: resultData.confidence === 'Hybrid AI' ? '#007AFF' : Colors.lavender }]}>
                          {resultData.confidence === 'Hybrid AI' ? 'Hybrid AI' : 'Rule-Based'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.scoreText}>
                      Rule Score: <Text style={styles.boldText}>{resultData.rule_score}%</Text>
                    </Text>
                    {resultData.confidence === 'Hybrid AI' && (
                      <Text style={styles.scoreText}>
                        AI Prediction: <Text style={styles.boldText}>{resultData.ml_probability}%</Text>
                      </Text>
                    )}
                  </View>
                </View>

                {/* Score Contribution breakdown (Rule vs ML weight) */}
                {resultData.confidence === 'Hybrid AI' && (
                  <View style={styles.contributionSection}>
                    <Text style={styles.contributionTitle}>Fusion Weights & Contribution</Text>
                    <View style={styles.contributionRow}>
                      <View style={styles.contributionCol}>
                        <Text style={styles.contributionLabel}>Medical Rules</Text>
                        <Text style={styles.contributionWeight}>Weight: 40%</Text>
                        <Text style={styles.contributionValue}>+{(resultData.rule_score * 0.4).toFixed(1)}%</Text>
                      </View>
                      <View style={styles.contributionDivider} />
                      <View style={styles.contributionCol}>
                        <Text style={styles.contributionLabel}>AI Prediction</Text>
                        <Text style={styles.contributionWeight}>Weight: 60%</Text>
                        <Text style={styles.contributionValue}>+{(resultData.ml_probability * 0.6).toFixed(1)}%</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Reasons List */}
                {resultData.reasons && resultData.reasons.length > 0 && (
                  <View style={styles.reasonsSection}>
                    <Text style={styles.reasonsTitle}>Top Contributors</Text>
                    <View style={styles.reasonsList}>
                      {resultData.reasons.map((reason: string, index: number) => (
                        <View key={index} style={styles.reasonRow}>
                          <Text style={styles.reasonCheck}>✓</Text>
                          <Text style={styles.reasonText}>{reason}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Hybrid source statement */}
                <View style={styles.evidenceDisclaimer}>
                  <Text style={styles.evidenceDisclaimerText}>
                    {resultData.confidence === 'Hybrid AI'
                      ? "This result combines evidence-based medical rules with an AI prediction model."
                      : "This assessment is calculated using evidence-based medical rules."}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerTitle}>⚠️ Medical Disclaimer</Text>
              <Text style={styles.disclaimerText}>
                This assessment estimates risk factors only and is not a medical diagnosis. 
                Please consult a healthcare professional for an official clinical evaluation.
              </Text>
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={restartAssessment}>
              <Text style={styles.btnTextPrimary}>Retake Assessment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={() => { setIsTakingNewAssessment(false); setStep(0); }}>
              <Text style={styles.btnTextSecondary}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
        </>
        )}
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  introContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    maxWidth: 600,
    alignSelf: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.lavenderBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.lavenderLight,
    ...Shadows.md,
  },
  introTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  introSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  disclaimerBox: {
    backgroundColor: Colors.goldBg,
    borderWidth: 1.5,
    borderColor: Colors.gold + '50',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  disclaimerTitle: {
    ...Typography.bodyBold,
    color: Colors.gold,
    marginBottom: 4,
  },
  disclaimerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  formContainer: {
    maxWidth: 650,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  bmiDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lavenderBg,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  bmiLabel: {
    ...Typography.captionBold,
    color: Colors.lavender,
    marginRight: 6,
  },
  bmiValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  symptomsList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  symptomRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  symptomEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  symptomText: {
    flex: 1,
    ...Typography.body,
    color: Colors.textSecondary,
  },
  symptomTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCircleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkmarkIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  ultrasoundPlaceholder: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed' as any,
    borderRadius: Radius.md,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  ultrasoundIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  ultrasoundText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  ultrasoundSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionHeader: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorBanner: {
    backgroundColor: Colors.coralBg,
    borderWidth: 1,
    borderColor: Colors.coral,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    ...Typography.body,
    color: Colors.danger,
    textAlign: 'center',
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  btnTextPrimary: {
    ...Typography.bodyBold,
    color: '#fff',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextSecondary: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    maxWidth: 600,
    alignSelf: 'center',
    flex: 1,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.mint,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  successTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  percentageCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  percentageSub: {
    ...Typography.micro,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    marginTop: -2,
  },
  resultMeta: {
    flex: 1,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: {
    ...Typography.captionBold,
  },
  scoreText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  boldText: {
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  confidenceText: {
    ...Typography.micro,
    color: Colors.textMuted,
  },
  reasonsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  reasonsTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  reasonsList: {
    gap: Spacing.xs,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reasonCheck: {
    color: Colors.lavender,
    fontWeight: '700' as const,
    fontSize: 14,
  },
  reasonText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  contributionSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  contributionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  contributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contributionCol: {
    flex: 1,
    alignItems: 'center',
  },
  contributionDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  contributionLabel: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
  },
  contributionWeight: {
    ...Typography.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  contributionValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.primary,
    marginTop: 4,
  },
  evidenceDisclaimer: {
    backgroundColor: Colors.lavenderBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  evidenceDisclaimerText: {
    ...Typography.captionBold,
    color: Colors.lavender,
    textAlign: 'center',
    lineHeight: 18,
  },
  hubContainer: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingVertical: Spacing.md,
  },
  hubTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  hubSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.lg,
    gap: 4,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  subTabBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  subTabBtnActive: {
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  subTabBtnText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  subTabBtnTextActive: {
    color: Colors.primary,
  },
  hubCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  cardHeader: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  cardDate: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  scoreMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: Radius.full,
    borderWidth: 6,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '05',
  },
  scoreLargeText: {
    ...Typography.h2,
    color: Colors.primary,
    lineHeight: 28,
  },
  scoreSubText: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  metricLabelSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  explanationBodyText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  recSplitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dietSubHeader: {
    ...Typography.bodyBold,
    color: Colors.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  mealName: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
  },
  mealDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  bulletItem: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginVertical: 2,
  },
  safetyNote: {
    ...Typography.micro,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  reminderRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reminderTextInline: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  chartContainer: {
    marginVertical: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chartTitle: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  chartBarRow: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.sm,
  },
  chartBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarWrapper: {
    height: 80,
    width: 18,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  chartBarLabel: {
    ...Typography.micro,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  chartBarDate: {
    ...Typography.micro,
    color: Colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyRowSelected: {
    backgroundColor: Colors.primary + '05',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  historyDate: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  historyDetails: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chatWelcomeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  chatArea: {
    height: 250,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    marginBottom: Spacing.md,
  },
  chatBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.xs,
  },
  chatBubbleUser: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  chatBubbleBot: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    ...Shadows.xs,
  },
  chatBubbleUserText: {
    ...Typography.body,
    color: '#fff',
  },
  chatBubbleBotText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chatSendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendBtnText: {
    ...Typography.bodyBold,
    color: '#fff',
  },
  articleTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  articleText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reviewOverlayContainer: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    paddingVertical: Spacing.md,
  },
  reviewTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  reviewSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  lowConfidenceRow: {
    backgroundColor: Colors.goldBg,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
  },
  reviewRowLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  reviewInputCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unitText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    minWidth: 45,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
  },
  deleteBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  addTestContainer: {
    marginTop: Spacing.lg,
  },
  addTestBadge: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  addTestBadgeText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  selectorBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  selectorBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  selectorBtnText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  selectorBtnTextActive: {
    color: '#fff',
  },
  uploadReportCard: {
    backgroundColor: Colors.lavenderBg,
    borderWidth: 1.5,
    borderColor: Colors.lavenderLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  uploadReportCardTitle: {
    ...Typography.bodyBold,
    color: Colors.lavender,
    marginBottom: 4,
  },
  uploadReportCardText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  uploadReportCardInline: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  uploadReportCardTitleInline: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  uploadReportCardTextInline: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
