import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, useWindowDimensions, Platform,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge } from '../../components/PremiumUI';
import { analyzeMedicalReport, ReportAnalysisResult } from '../../services/api';

const SAMPLE_REPORTS = [
  {
    label: '🩸 Blood Test (Hemoglobin)',
    text: `PATIENT REPORT: Routine Antenatal Blood Panel
GESTATION: 24 weeks
RESULTS:
Complete Blood Count (CBC):
- Hemoglobin: 10.2 g/dL (Reference Range: 11.5 - 15.0 g/dL)
- Hematocrit: 31% (Reference Range: 35% - 45%)
- White Blood Cell count: 11,500 /uL (Reference Range: 4,500 - 11,000 /uL)
- Platelets: 210,000 /uL (Reference Range: 150,000 - 450,000 /uL)
CLINICAL NOTES:
Mild microcytic anemia observed. Erythrocyte indices suggest potential early iron deficiency.`,
  },
  {
    label: '🤰 Ultrasound (Trimester 2)',
    text: `ULTRASOUND REPORT: Routine Obstetrical Scan
GESTATIONAL AGE: 20 weeks 3 days
FINDINGS:
- Presentation: Vertex
- Fetal Heart Motion: Present, 142 bpm
- Placenta: Anterior, clear of internal os
- Amniotic Fluid Index (AFI): 14.5 cm (Normal range: 5.0 - 25.0 cm)
- Estimated Fetal Weight (EFW): 340 grams
IMPRESSION:
Single active intrauterine pregnancy of 20 weeks gestational size. Normal fetal anatomy and amniotic fluid volume.`,
  }
];

export default function ReportAnalyzerScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [reportText, setReportText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportAnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async (textToAnalyze?: string) => {
    const activeText = textToAnalyze !== undefined ? textToAnalyze : reportText;
    if (!activeText.trim() && !selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeMedicalReport(activeText.trim() || null, selectedFile);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze the report. Please make sure the AI service is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (sample: string) => {
    setSelectedFile(null);
    setReportText(sample);
    handleAnalyze(sample);
  };

  return (
    <DashboardLayout title="Report Analyzer">
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>📄 Medical Report Analyzer</Text>
          <Text style={styles.pageSub}>
            Translate blood tests, ultrasounds, and reports into simple, grandmother-friendly language.
          </Text>
        </View>

        <View style={[styles.mainLayout, isWide && styles.rowLayout]}>
          
          {/* Left / Input Section */}
          <View style={[styles.section, isWide && styles.leftSection]}>
            <GlassCard accent={Colors.lavender}>
              <SectionHeader title="Input Report" icon="📝" />
              
              <Text style={styles.instructionText}>
                Upload an image/PDF or paste the text of your report below:
              </Text>

              {/* File Upload Area */}
              {Platform.OS === 'web' && (
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile({
                        uri: URL.createObjectURL(file),
                        name: file.name,
                        type: file.type
                      } as any);
                    }
                  }}
                />
              )}

              <View style={styles.uploadRow}>
                <TouchableOpacity
                  style={[styles.uploadButton, selectedFile && styles.uploadButtonActive]}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      fileInputRef.current?.click();
                    } else {
                      try {
                        const DocumentPicker = require('expo-document-picker');
                        const res = await DocumentPicker.getDocumentAsync({
                          type: ['application/pdf', 'image/*'],
                          copyToCacheDirectory: true,
                        });
                        if (!res.canceled && res.assets && res.assets.length > 0) {
                          const asset = res.assets[0];
                          setSelectedFile({
                            uri: asset.uri,
                            name: asset.name,
                            type: asset.mimeType || 'application/octet-stream',
                          } as any);
                        }
                      } catch (err) {
                        console.error('Failed to pick document:', err);
                        alert('Could not open document picker.');
                      }
                    }
                  }}
                >
                  <Text style={[styles.uploadButtonText, selectedFile && styles.uploadButtonTextActive]}>
                    {selectedFile ? `📎 ${selectedFile.name}` : '📁 Upload PDF / Image Report'}
                  </Text>
                </TouchableOpacity>

                {selectedFile && (
                  <TouchableOpacity
                    style={styles.clearFileButton}
                    onPress={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <Text style={styles.clearFileText}>✕ Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.orText}>— OR —</Text>

              {/* Sample Buttons */}
              <View style={styles.samplesRow}>
                {SAMPLE_REPORTS.map((sample, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.sampleButton}
                    onPress={() => loadSample(sample.text)}
                  >
                    <Text style={styles.sampleButtonText}>{sample.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={8}
                placeholder="Or paste your medical report text here..."
                placeholderTextColor={Colors.textMuted}
                value={reportText}
                onChangeText={setReportText}
              />

              <TouchableOpacity
                style={[styles.actionButton, (!reportText.trim() && !selectedFile) && styles.disabledButton]}
                onPress={() => handleAnalyze()}
                disabled={loading || (!reportText.trim() && !selectedFile)}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Analyze Report ✨</Text>
                )}
              </TouchableOpacity>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}
            </GlassCard>
          </View>

          {/* Right / Results Section */}
          <View style={[styles.section, isWide && styles.rightSection]}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Reading your report...</Text>
                <Text style={styles.loadingSub}>Simplifying terms and checking medical guidelines</Text>
              </View>
            )}

            {!loading && !result && (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderEmoji}>🩺</Text>
                <Text style={styles.placeholderTitle}>Awaiting Report</Text>
                <Text style={styles.placeholderSub}>
                  Your simplified medical analysis will appear here once you paste the report and click Analyze.
                </Text>
              </View>
            )}

            {!loading && result && (
              <View style={styles.resultContainer}>
                
                {/* 1. Summary Card */}
                <GlassCard accent={Colors.primary} style={styles.cardSpacing}>
                  <SectionHeader title="Overall Summary" icon="🌸" />
                  <Text style={styles.summaryText}>{result.summary}</Text>
                </GlassCard>

                {/* 2. Key Indicators */}
                {result.key_indicators && result.key_indicators.length > 0 && (
                  <GlassCard accent={Colors.teal} style={styles.cardSpacing}>
                    <SectionHeader title="Key Indicators Explained" icon="📊" />
                    {result.key_indicators.map((ind, idx) => {
                      const badgeColor = 
                        ind.status === 'low' ? Colors.warning :
                        ind.status === 'high' ? Colors.error : Colors.success;
                      return (
                        <View key={idx} style={styles.indicatorCard}>
                          <View style={styles.indicatorHeader}>
                            <Text style={styles.indicatorName}>{ind.name}</Text>
                            <View style={styles.indicatorMeta}>
                              <Text style={styles.indicatorValue}>{ind.value}</Text>
                              <Badge label={ind.status.toUpperCase()} color={badgeColor} />
                            </View>
                          </View>
                          <Text style={styles.indicatorExplanation}>{ind.explanation}</Text>
                        </View>
                      );
                    })}
                  </GlassCard>
                )}

                {/* 3. Jargon Buster */}
                {result.jargon_buster && result.jargon_buster.length > 0 && (
                  <GlassCard accent={Colors.skyBlue} style={styles.cardSpacing}>
                    <SectionHeader title="Jargon Buster" icon="📚" />
                    <Text style={styles.busterIntro}>Simple definitions for difficult terms:</Text>
                    {result.jargon_buster.map((item, idx) => (
                      <View key={idx} style={styles.jargonRow}>
                        <Text style={styles.jargonTerm}>{item.term}</Text>
                        <Text style={styles.jargonMeaning}>→ {item.meaning}</Text>
                      </View>
                    ))}
                  </GlassCard>
                )}

                {/* 4. Action Steps */}
                {result.action_steps && result.action_steps.length > 0 && (
                  <GlassCard accent={Colors.lavender} style={styles.cardSpacing}>
                    <SectionHeader title="Simple Action Tips" icon="💪" />
                    {result.action_steps.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View style={styles.stepDot} />
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </GlassCard>
                )}

                {/* 5. Warning Flags */}
                {result.warning_flags && result.warning_flags.length > 0 && (
                  <GlassCard accent={Colors.error} style={styles.cardSpacing}>
                    <SectionHeader title="When to Consult OB-GYN" icon="🚨" />
                    {result.warning_flags.map((flag, idx) => (
                      <View key={idx} style={styles.warningRow}>
                        <Text style={styles.warningText}>⚠️ {flag}</Text>
                      </View>
                    ))}
                  </GlassCard>
                )}

                {/* Disclaimer */}
                <View style={styles.disclaimerContainer}>
                  <Text style={styles.disclaimerText}>
                    ⚕️ Disclaimer: This tool uses artificial intelligence to explain general terms. It is not a clinical diagnosis or medical treatment. Always consult your obstetrician or doctor to verify your health data.
                  </Text>
                </View>

              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  pageHeader: { marginBottom: Spacing.lg },
  pageTitle: { ...Typography.h1, color: Colors.textPrimary, marginBottom: 4 },
  pageSub: { ...Typography.body, color: Colors.textSecondary, fontSize: 14 },
  
  mainLayout: { flex: 1, gap: Spacing.md },
  rowLayout: { flexDirection: 'row' },
  section: { flex: 1 },
  leftSection: { flex: 1.2 },
  rightSection: { flex: 1.8 },

  instructionText: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  samplesRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  sampleButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sampleButtonText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  textInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 180,
    marginBottom: Spacing.md,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadows.sm,
  },
  disabledButton: { backgroundColor: Colors.textMuted + '80' },
  actionButtonText: { ...Typography.body, color: '#fff', fontWeight: '700' },

  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonActive: {
    backgroundColor: Colors.lavenderBg,
    borderColor: Colors.lavender,
    borderStyle: 'solid',
  },
  uploadButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  uploadButtonTextActive: {
    color: Colors.lavender,
  },
  clearFileButton: {
    backgroundColor: Colors.errorLight + '20',
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.errorLight,
  },
  clearFileText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '700',
  },
  orText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontWeight: '600',
  },

  errorContainer: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.errorLight + '20',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorText: { ...Typography.caption, color: Colors.error, fontWeight: '600' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 250,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  loadingText: { ...Typography.h3, color: Colors.textPrimary, marginTop: Spacing.md },
  loadingSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },

  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 350,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    borderStyle: 'dashed',
  },
  placeholderEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  placeholderTitle: { ...Typography.h3, color: Colors.textPrimary },
  placeholderSub: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },

  resultContainer: { flex: 1 },
  cardSpacing: { marginBottom: Spacing.md },
  summaryText: { ...Typography.body, color: Colors.textPrimary, lineHeight: 22 },

  indicatorCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
  },
  indicatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  indicatorName: { ...Typography.body, fontWeight: '700', color: Colors.textPrimary },
  indicatorMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  indicatorValue: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  indicatorExplanation: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },

  busterIntro: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm, fontStyle: 'italic' },
  jargonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  jargonTerm: { ...Typography.caption, fontWeight: '700', color: Colors.textPrimary, minWidth: 120 },
  jargonMeaning: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.lavender },
  stepText: { ...Typography.body, color: Colors.textPrimary, fontSize: 13, flex: 1 },

  warningRow: {
    backgroundColor: Colors.errorLight + '10',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  warningText: { ...Typography.caption, color: Colors.error, fontWeight: '600', lineHeight: 18 },

  disclaimerContainer: { marginTop: Spacing.sm, paddingHorizontal: Spacing.xs },
  disclaimerText: { ...Typography.micro, color: Colors.textMuted, lineHeight: 16 },
});
