import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, RefreshControl, Image, Linking, Platform, useWindowDimensions
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge } from '../../components/PremiumUI';
import { HealthRecordService, HealthRecordItem, HealthRecordsResponse } from '../../services/api';

const ROLES = [
  { id: 'user', label: 'Mother / User', icon: '🤰', description: 'Personal logs & wellness notes' },
  { id: 'hospital', label: 'Hospital / Doctor', icon: '🏥', description: 'Clinical charts & prescriptions' },
  { id: 'investigator', label: 'Investigator / Reviewer', icon: '🔍', description: 'Audit logs & lab verifications' },
  { id: 'admin', label: 'Admin / Authority', icon: '🛡️', description: 'System-wide compliance escrow' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'verified', label: 'Verified' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'pending', label: 'Pending' },
  { id: 'flagged', label: 'Flagged' },
];

const CATEGORIES = [
  'Ultrasound Scan',
  'Blood Test',
  'PCOS Assessment',
  'Prescription',
  'Clinical Note',
  'Authority Log',
  'General',
];

const RISK_LEVELS = [
  'Low Risk',
  'Moderate Risk',
  'High Risk',
];

const SAMPLE_EVIDENCE_PRESETS = [
  { name: 'Ultrasound_20W_Scan.jpg', type: 'image', url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80' },
  { name: 'CBC_Blood_Panel_Report.pdf', type: 'pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
  { name: 'PCOS_Metabolic_Summary.png', type: 'image', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80' },
  { name: 'Prescription_Rx_Scan.jpg', type: 'image', url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&auto=format&fit=crop&q=80' },
];

export default function HealthReportsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activePickerTargetRef = useRef<'new' | 'attach'>('new');

  const [activeRole, setActiveRole] = useState<string>('user');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [data, setData] = useState<HealthRecordsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Selected Record & Modals
  const [selectedRecord, setSelectedRecord] = useState<HealthRecordItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [attachModalVisible, setAttachModalVisible] = useState<boolean>(false);
  const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);

  // Attachment Form
  const [attachUrl, setAttachUrl] = useState<string>('');
  const [attachName, setAttachName] = useState<string>('');
  const [attachType, setAttachType] = useState<string>('image');
  const [attaching, setAttaching] = useState<boolean>(false);

  // Add New Record Form
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Ultrasound Scan');
  const [newGestationalWeek, setNewGestationalWeek] = useState<string>('24');
  const [newRiskLevel, setNewRiskLevel] = useState<string>('Low Risk');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newDoctorNotes, setNewDoctorNotes] = useState<string>('');
  const [newRoleVisibility, setNewRoleVisibility] = useState<'user' | 'hospital' | 'investigator' | 'admin'>('user');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState<string>('');
  const [newAttachmentName, setNewAttachmentName] = useState<string>('');
  const [newAttachmentType, setNewAttachmentType] = useState<string>('image');
  const [creatingRecord, setCreatingRecord] = useState<boolean>(false);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await HealthRecordService.getRecords(activeRole, activeStatus);
      setData(res);
    } catch (err) {
      console.error('Error fetching health records:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeRole, activeStatus]);

  useEffect(() => {
    setLoading(true);
    fetchRecords();
  }, [fetchRecords]);

  // File Picker Handler (PDF & Image support)
  const handlePickDocument = async (target: 'new' | 'attach') => {
    activePickerTargetRef.current = target;
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
              const fileType = isPdf ? 'pdf' : (file.type.includes('image') ? 'image' : 'document');
              if (activePickerTargetRef.current === 'new') {
                setNewAttachmentUrl(result);
                setNewAttachmentName(file.name);
                setNewAttachmentType(fileType);
              } else {
                setAttachUrl(result);
                setAttachName(file.name);
                setAttachType(fileType);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        fileInputRef.current.click();
      }
    } else {
      try {
        const DocumentPicker = require('expo-document-picker');
        const res = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          const asset = res.assets[0];
          const isPdf = asset.mimeType?.includes('pdf') || asset.name.toLowerCase().endsWith('.pdf');
          const fileType = isPdf ? 'pdf' : (asset.mimeType?.includes('image') ? 'image' : 'document');
          if (target === 'new') {
            setNewAttachmentUrl(asset.uri);
            setNewAttachmentName(asset.name);
            setNewAttachmentType(fileType);
          } else {
            setAttachUrl(asset.uri);
            setAttachName(asset.name);
            setAttachType(fileType);
          }
        }
      } catch (err) {
        console.error('Failed to pick document:', err);
      }
    }
  };

  const handleOpenDetail = (record: HealthRecordItem) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const handleOpenAttach = (record: HealthRecordItem) => {
    setSelectedRecord(record);
    setAttachUrl(record.attachment_url || '');
    setAttachName(record.attachment_name || 'Evidence_File.jpg');
    setAttachType(record.attachment_type || 'image');
    setAttachModalVisible(true);
  };

  const handleOpenExport = (record: HealthRecordItem) => {
    setSelectedRecord(record);
    setExportModalVisible(true);
  };

  const handleSaveAttachment = async () => {
    if (!selectedRecord || !attachUrl.trim()) return;
    setAttaching(true);
    try {
      const updated = await HealthRecordService.attachEvidence(
        selectedRecord.id,
        attachUrl.trim(),
        attachName.trim() || 'Evidence_File',
        attachType
      );
      setSelectedRecord(updated);
      setAttachModalVisible(false);
      fetchRecords();
    } catch (err) {
      console.error('Failed to attach evidence:', err);
    } finally {
      setAttaching(false);
    }
  };

  const handleCreateRecord = async () => {
    if (!newTitle.trim()) {
      alert('Please enter a report title.');
      return;
    }
    setCreatingRecord(true);
    try {
      await HealthRecordService.createRecord({
        title: newTitle.trim(),
        category: newCategory,
        gestational_week: parseInt(newGestationalWeek, 10) || 24,
        risk_level: newRiskLevel,
        description: newDescription.trim() || 'Patient uploaded medical report.',
        doctor_notes: newDoctorNotes.trim() || undefined,
        role_visibility: newRoleVisibility,
        status: 'verified',
        attachment_url: newAttachmentUrl.trim() || undefined,
        attachment_name: newAttachmentName.trim() || (newAttachmentUrl ? 'Uploaded_Report' : undefined),
        attachment_type: newAttachmentType || undefined,
      });

      setAddModalVisible(false);
      // Reset Form
      setNewTitle('');
      setNewDescription('');
      setNewDoctorNotes('');
      setNewAttachmentUrl('');
      setNewAttachmentName('');
      setNewAttachmentType('image');

      fetchRecords();
    } catch (err) {
      console.error('Failed to create health record:', err);
      alert('Failed to save health report. Please try again.');
    } finally {
      setCreatingRecord(false);
    }
  };

  const handleTriggerExport = (format: 'html' | 'pdf' | 'csv') => {
    if (!selectedRecord) return;
    const exportUrl = HealthRecordService.getExportUrl(selectedRecord.id, format);
    if (Platform.OS === 'web') {
      window.open(exportUrl, '_blank');
    } else {
      Linking.openURL(exportUrl).catch(e => console.error('Export download error:', e));
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'verified': return Colors.mint;
      case 'under_review': return Colors.warning;
      case 'flagged': return Colors.danger;
      case 'pending': return Colors.skyBlue;
      default: return Colors.primary;
    }
  };

  return (
    <DashboardLayout title="Health Reports">
      {/* Hidden file input for Web platform */}
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={fileInputRef as any}
          style={{ display: 'none' }}
          accept="image/*,application/pdf"
        />
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRecords(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.pageTitle}>📈 Health Records & Reports</Text>
            <TouchableOpacity style={styles.addRecordHeaderBtn} onPress={() => setAddModalVisible(true)}>
              <Text style={styles.addRecordHeaderBtnText}>+ Add Health Report</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pageSub}>
            Upload PDF/Image medical reports, manage role-aware archives, and export reports in multiple formats.
          </Text>
        </View>

        {/* ── Role-Aware Filter Tabs ──────────────────────────────────── */}
        <GlassCard accent={Colors.lavender}>
          <SectionHeader title="Role Viewpoint Selector" icon="🔐" action="Role Scope" />
          <Text style={styles.roleHint}>
            Select a role tab to scope access rights and view health records visible to that stakeholder:
          </Text>
          
          <View style={styles.roleGrid}>
            {ROLES.map(r => {
              const isActive = activeRole === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleCard, isActive && styles.roleCardActive]}
                  onPress={() => setActiveRole(r.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roleIcon}>{r.icon}</Text>
                  <Text style={[styles.roleLabel, isActive && styles.roleLabelActive]}>{r.label}</Text>
                  <Text style={styles.roleDesc} numberOfLines={1}>{r.description}</Text>
                  {isActive && <View style={styles.roleActiveDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Status filter bar & Scoped Count */}
          <View style={styles.statusFilterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusPills}>
              {STATUS_FILTERS.map(sf => {
                const isSelected = activeStatus === sf.id;
                return (
                  <TouchableOpacity
                    key={sf.id}
                    style={[styles.statusPill, isSelected && styles.statusPillActive]}
                    onPress={() => setActiveStatus(sf.id)}
                  >
                    <Text style={[styles.statusPillText, isSelected && styles.statusPillTextActive]}>{sf.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Scoped Visible Count Indicator */}
          <View style={styles.counterStrip}>
            <Text style={styles.counterText}>
              Showing <Text style={styles.counterHighlight}>{data?.visible_count ?? 0}</Text> of <Text style={styles.counterHighlight}>{data?.total_count ?? 0}</Text> records for <Text style={{ color: Colors.primary, fontWeight: '700' }}>{ROLES.find(r => r.id === activeRole)?.label}</Text>
            </Text>
          </View>
        </GlassCard>

        {/* ── Health Records List ───────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>📋 Scoped Medical Records</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            {loading && <ActivityIndicator size="small" color={Colors.primary} />}
            <TouchableOpacity style={styles.addRecordSmallBtn} onPress={() => setAddModalVisible(true)}>
              <Text style={styles.addRecordSmallBtnText}>+ Add New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {data?.records && data.records.length > 0 ? (
          data.records.map((rec) => {
            const badgeColor = getStatusBadgeColor(rec.status);
            const hasAttachment = Boolean(rec.attachment_url);

            return (
              <View key={rec.id} style={styles.recordCard}>
                {/* Top card row */}
                <View style={styles.cardHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{rec.category}</Text>
                  </View>
                  <View style={styles.headerBadges}>
                    <Badge label={rec.status.toUpperCase()} color={badgeColor} />
                    <View style={styles.scopeTag}>
                      <Text style={styles.scopeTagText}>{rec.role_visibility.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                {/* Title & Description */}
                <Text style={styles.recordTitle}>{rec.title}</Text>
                <Text style={styles.recordSub} numberOfLines={2}>{rec.description}</Text>

                {/* Patient & Gestational info */}
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>👤 {rec.patient_name || 'Patient'} · 🤰 Wk {rec.gestational_week || 24}</Text>
                  <Text style={styles.riskText}>⚠️ {rec.risk_level || 'Low Risk'}</Text>
                </View>

                {/* Attachment Indicator Bar */}
                <View style={styles.attachmentBar}>
                  {hasAttachment ? (
                    <TouchableOpacity style={styles.attachmentPill} onPress={() => handleOpenDetail(rec)}>
                      <Text style={styles.attachmentPillIcon}>
                        {rec.attachment_type === 'image' ? '📷' : '📄'}
                      </Text>
                      <Text style={styles.attachmentPillName} numberOfLines={1}>
                        {rec.attachment_name || 'Attached Evidence'}
                      </Text>
                      <Text style={styles.attachmentViewBtn}>View Report ›</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.noAttachmentBtn} onPress={() => handleOpenAttach(rec)}>
                      <Text style={styles.noAttachmentText}>+ Attach PDF or Image File</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Card Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => handleOpenDetail(rec)}>
                    <Text style={styles.actionBtnTextSecondary}>🔍 View Detail</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => handleOpenAttach(rec)}>
                    <Text style={styles.actionBtnTextSecondary}>📎 {hasAttachment ? 'Edit Attachment' : 'Attach File'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleOpenExport(rec)}>
                    <Text style={styles.actionBtnTextPrimary}>📥 Export Report</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <GlassCard>
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No Records Visible</Text>
              <Text style={styles.emptySub}>
                There are no health records visible for the <Text style={{ fontWeight: '700' }}>{activeRole}</Text> role under the selected status filter.
              </Text>
              <TouchableOpacity style={styles.addRecordHeaderBtn} onPress={() => setAddModalVisible(true)}>
                <Text style={styles.addRecordHeaderBtnText}>+ Add First Health Report</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* ── ADD NEW HEALTH REPORT MODAL ────────────────────────────────────── */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>📄 Add New Health Report</Text>
                <Text style={styles.exportSub}>Upload a PDF / Image report or record clinical findings</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>REPORT TITLE *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. CBC Blood Panel / 20-Week Scan"
                placeholderTextColor={Colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>REPORT CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 4 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chipSelect, newCategory === cat && styles.chipSelectActive]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text style={[styles.chipSelectText, newCategory === cat && styles.chipSelectTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>GESTATIONAL WEEK</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="24"
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.textMuted}
                    value={newGestationalWeek}
                    onChangeText={setNewGestationalWeek}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>RISK CLASSIFICATION</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                    {RISK_LEVELS.map(rl => (
                      <TouchableOpacity
                        key={rl}
                        style={[styles.miniChip, newRiskLevel === rl && styles.miniChipActive]}
                        onPress={() => setNewRiskLevel(rl)}
                      >
                        <Text style={[styles.miniChipText, newRiskLevel === rl && styles.miniChipTextActive]}>{rl.replace(' Risk', '')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>REPORT SUMMARY / DESCRIPTION</Text>
              <TextInput
                style={[styles.textInput, { height: 70 }]}
                multiline
                placeholder="Describe key findings, diagnosis, or report notes..."
                placeholderTextColor={Colors.textMuted}
                value={newDescription}
                onChangeText={setNewDescription}
              />

              <Text style={styles.inputLabel}>DOCTOR CLINICAL NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                multiline
                placeholder="Clinical observations or prescribed instructions..."
                placeholderTextColor={Colors.textMuted}
                value={newDoctorNotes}
                onChangeText={setNewDoctorNotes}
              />

              {/* ── UPLOAD PDF OR IMAGE ATTACHMENT SECTION ───────────────────── */}
              <View style={styles.uploadSectionBox}>
                <Text style={styles.modalSectionTitle}>📷 / 📄 Attach Report File (PDF or Image)</Text>
                
                <TouchableOpacity style={styles.pickFileBtn} onPress={() => handlePickDocument('new')}>
                  <Text style={styles.pickFileBtnText}>
                    {newAttachmentName ? `📎 Change File (${newAttachmentName})` : '📁 Pick PDF or Image File'}
                  </Text>
                </TouchableOpacity>

                {newAttachmentUrl ? (
                  <View style={styles.fileSelectedBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 22 }}>{newAttachmentType === 'pdf' ? '📄' : '🖼️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fileNameText} numberOfLines={1}>{newAttachmentName || 'Attached_Report'}</Text>
                        <Text style={styles.fileTypeText}>{newAttachmentType.toUpperCase()} File attached</Text>
                      </View>
                      <TouchableOpacity onPress={() => { setNewAttachmentUrl(''); setNewAttachmentName(''); }}>
                        <Text style={{ color: Colors.danger, fontWeight: '700' }}>Remove</Text>
                      </TouchableOpacity>
                    </View>

                    {newAttachmentType === 'image' && newAttachmentUrl.startsWith('data:image') && (
                      <Image source={{ uri: newAttachmentUrl }} style={{ width: '100%', height: 140, borderRadius: 8, marginTop: 8 }} resizeMode="cover" />
                    )}
                  </View>
                ) : (
                  <Text style={styles.orText}>- OR enter URL / Choose sample below -</Text>
                )}

                <Text style={styles.inputLabel}>OR ATTACHMENT FILE URL / URI</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://example.com/report.pdf or file uri"
                  placeholderTextColor={Colors.textMuted}
                  value={newAttachmentUrl}
                  onChangeText={(val) => {
                    setNewAttachmentUrl(val);
                    if (val.includes('.pdf')) setNewAttachmentType('pdf');
                  }}
                  autoCapitalize="none"
                />

                {/* Presets */}
                <Text style={[styles.inputLabel, { marginTop: 8 }]}>✨ SAMPLE REPORT PRESETS</Text>
                <View style={styles.presetGroup}>
                  {SAMPLE_EVIDENCE_PRESETS.map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.presetChip}
                      onPress={() => {
                        setNewAttachmentUrl(p.url);
                        setNewAttachmentName(p.name);
                        setNewAttachmentType(p.type);
                      }}
                    >
                      <Text style={styles.presetChipText}>{p.type === 'image' ? '🖼️' : '📄'} {p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveAttachBtn} onPress={handleCreateRecord} disabled={creatingRecord}>
                {creatingRecord ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveAttachBtnText}>Save & Create Health Record</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────── */}
      {selectedRecord && (
        <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, isWide && styles.modalCardWide]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCategory}>{selectedRecord.category} · Week {selectedRecord.gestational_week}</Text>
                  <Text style={styles.modalTitle}>{selectedRecord.title}</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Status & Risk Banner */}
                <View style={styles.modalBanner}>
                  <Badge label={selectedRecord.status.toUpperCase()} color={getStatusBadgeColor(selectedRecord.status)} />
                  <Text style={styles.modalRisk}>Scope: {selectedRecord.role_visibility.toUpperCase()} | {selectedRecord.risk_level}</Text>
                </View>

                {/* Description */}
                <Text style={styles.modalSectionTitle}>📝 Record Summary</Text>
                <Text style={styles.modalBody}>{selectedRecord.description || 'No additional summary recorded.'}</Text>

                {/* Lab Indicators */}
                {selectedRecord.lab_values && Object.keys(selectedRecord.lab_values).length > 0 && (
                  <View style={styles.labsWrap}>
                    <Text style={styles.modalSectionTitle}>📊 Lab & Clinical Values</Text>
                    {Object.entries(selectedRecord.lab_values).map(([k, v], idx) => (
                      <View key={idx} style={styles.labRow}>
                        <Text style={styles.labKey}>{k}</Text>
                        <Text style={styles.labVal}>{String(v)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Clinical Notes */}
                {selectedRecord.doctor_notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesTitle}>🩺 Doctor Clinical Notes</Text>
                    <Text style={styles.notesBody}>{selectedRecord.doctor_notes}</Text>
                  </View>
                )}

                {/* AI Recommendations */}
                {selectedRecord.recommendations && selectedRecord.recommendations.length > 0 && (
                  <View style={styles.recsBox}>
                    <Text style={styles.recsTitle}>💡 AI Recommendations</Text>
                    {selectedRecord.recommendations.map((rec, i) => (
                      <Text key={i} style={styles.recItem}>• {rec}</Text>
                    ))}
                  </View>
                )}

                {/* Attached Supporting Evidence Display */}
                <View style={styles.evidenceSection}>
                  <Text style={styles.modalSectionTitle}>📷 Supporting Evidence & Attachment</Text>
                  {selectedRecord.attachment_url ? (
                    <View style={styles.evidenceCard}>
                      <View style={styles.evidenceCardHeader}>
                        <Text style={styles.evidenceFileName}>
                          {selectedRecord.attachment_type === 'image' ? '🖼️' : '📄'} {selectedRecord.attachment_name || 'Evidence_Scan'}
                        </Text>
                        <TouchableOpacity style={styles.changeLinkBtn} onPress={() => { setDetailModalVisible(false); handleOpenAttach(selectedRecord); }}>
                          <Text style={styles.changeLinkText}>Change</Text>
                        </TouchableOpacity>
                      </View>

                      {selectedRecord.attachment_type === 'image' ? (
                        <Image source={{ uri: selectedRecord.attachment_url }} style={styles.evidenceImagePreview} resizeMode="cover" />
                      ) : (
                        <View style={styles.pdfCardWrap}>
                          <Text style={styles.pdfIcon}>📄 PDF</Text>
                          <Text style={styles.pdfText}>Official Document / Scan Attachment</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.openUrlBtn}
                        onPress={() => Linking.openURL(selectedRecord.attachment_url!).catch(e => console.error(e))}
                      >
                        <Text style={styles.openUrlText}>🔗 Open Full Supporting File</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.noEvidenceWrap}>
                      <Text style={styles.noEvidenceText}>No supporting evidence attached to this record yet.</Text>
                      <TouchableOpacity style={styles.addEvidenceBtn} onPress={() => { setDetailModalVisible(false); handleOpenAttach(selectedRecord); }}>
                        <Text style={styles.addEvidenceBtnText}>+ Attach Evidence File / Link</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Detail Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.modalExportBtn} onPress={() => { setDetailModalVisible(false); handleOpenExport(selectedRecord); }}>
                  <Text style={styles.modalExportBtnText}>📥 Export Report (PDF/CSV/HTML)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── ATTACHMENT MODAL FOR EXISTING RECORDS ───────────────────────────── */}
      {selectedRecord && (
        <Modal visible={attachModalVisible} transparent animationType="slide" onRequestClose={() => setAttachModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📎 Attach PDF or Image File</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setAttachModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.inputLabel}>RECORD</Text>
                <Text style={styles.readOnlyTitle}>{selectedRecord.title}</Text>

                {/* PICK LOCAL FILE BUTTON */}
                <TouchableOpacity style={styles.pickFileBtn} onPress={() => handlePickDocument('attach')}>
                  <Text style={styles.pickFileBtnText}>
                    {attachName ? `📎 Change File (${attachName})` : '📁 Pick PDF or Image File'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>FILE OR IMAGE URL / URI</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://example.com/scan.jpg or file:///path"
                  placeholderTextColor={Colors.textMuted}
                  value={attachUrl}
                  onChangeText={setAttachUrl}
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>FILE DISPLAY NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ultrasound_Scan_20W.jpg"
                  placeholderTextColor={Colors.textMuted}
                  value={attachName}
                  onChangeText={setAttachName}
                />

                <Text style={styles.inputLabel}>FILE TYPE</Text>
                <View style={styles.typeRow}>
                  {['image', 'pdf', 'document'].map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, attachType === t && styles.typeBtnActive]}
                      onPress={() => setAttachType(t)}
                    >
                      <Text style={[styles.typeBtnText, attachType === t && styles.typeBtnTextActive]}>
                        {t === 'image' ? '📷 Image' : t === 'pdf' ? '📄 PDF' : '📝 Document'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Preset Evidence Samples */}
                <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>✨ QUICK SAMPLE PRESETS</Text>
                <View style={styles.presetGroup}>
                  {SAMPLE_EVIDENCE_PRESETS.map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.presetChip}
                      onPress={() => {
                        setAttachUrl(p.url);
                        setAttachName(p.name);
                        setAttachType(p.type);
                      }}
                    >
                      <Text style={styles.presetChipText}>{p.type === 'image' ? '🖼️' : '📄'} {p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.saveAttachBtn} onPress={handleSaveAttachment} disabled={attaching}>
                  {attaching ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveAttachBtnText}>Save & Link Evidence</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── EXPORT MODAL ───────────────────────────────────────────────────── */}
      {selectedRecord && (
        <Modal visible={exportModalVisible} transparent animationType="fade" onRequestClose={() => setExportModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 500 }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>📥 Export Health Report</Text>
                  <Text style={styles.exportSub}>Reuses captured fields, lab values, AI recs & notes</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setExportModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.exportList}>
                <TouchableOpacity style={styles.exportOption} onPress={() => handleTriggerExport('html')}>
                  <View style={[styles.exportIconCircle, { backgroundColor: Colors.lavenderBg }]}>
                    <Text style={styles.exportOptionIcon}>🌐</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportOptionTitle}>HTML Clinical Report</Text>
                    <Text style={styles.exportOptionDesc}>Rich formatted document with print/save layout</Text>
                  </View>
                  <Text style={styles.exportArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.exportOption} onPress={() => handleTriggerExport('pdf')}>
                  <View style={[styles.exportIconCircle, { backgroundColor: Colors.coralBg }]}>
                    <Text style={styles.exportOptionIcon}>🖨️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportOptionTitle}>PDF Printable Document</Text>
                    <Text style={styles.exportOptionDesc}>Print-ready clean PDF format with evidence links</Text>
                  </View>
                  <Text style={styles.exportArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.exportOption} onPress={() => handleTriggerExport('csv')}>
                  <View style={[styles.exportIconCircle, { backgroundColor: Colors.mint + '20' }]}>
                    <Text style={styles.exportOptionIcon}>📊</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportOptionTitle}>CSV Spreadsheet Dataset</Text>
                    <Text style={styles.exportOptionDesc}>Structured raw data file for Excel/Sheets analysis</Text>
                  </View>
                  <Text style={styles.exportArrow}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  pageHeader: { marginBottom: Spacing.md, marginTop: Spacing.xs },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },

  addRecordHeaderBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...Shadows.xs,
  },
  addRecordHeaderBtnText: { ...Typography.captionBold, color: '#fff' },

  addRecordSmallBtn: {
    backgroundColor: Colors.lavenderBg,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  addRecordSmallBtnText: { ...Typography.captionBold, color: Colors.lavender },

  roleHint: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8, marginBottom: Spacing.sm },
  roleCard: {
    flex: 1, minWidth: 140,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    position: 'relative' as any,
  },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(212,88,154,0.1)' },
  roleIcon: { fontSize: 20 },
  roleLabel: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '700' as const, marginTop: 4 },
  roleLabelActive: { color: Colors.primary },
  roleDesc: { ...Typography.micro, color: Colors.textMuted, marginTop: 2 },
  roleActiveDot: { position: 'absolute' as any, top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  statusFilterBar: { marginTop: Spacing.xs, marginBottom: Spacing.xs },
  statusPills: { gap: 6 },
  statusPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1, borderColor: Colors.border,
  },
  statusPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusPillText: { ...Typography.caption, color: Colors.textSecondary },
  statusPillTextActive: { color: '#fff', fontWeight: '700' as const },

  counterStrip: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  counterText: { ...Typography.caption, color: Colors.textSecondary },
  counterHighlight: { color: Colors.textPrimary, fontWeight: '800' as const },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.md },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, fontWeight: '800' as const },

  recordCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  categoryBadge: { backgroundColor: Colors.lavenderBg, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { ...Typography.micro, color: Colors.lavender, fontWeight: '700' as const },
  headerBadges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  scopeTag: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  scopeTagText: { ...Typography.micro, color: Colors.textMuted, fontWeight: '700' as const },

  recordTitle: { ...Typography.h3, color: Colors.textPrimary, fontSize: 16, marginTop: 4 },
  recordSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  metaText: { ...Typography.caption, color: Colors.textMuted },
  riskText: { ...Typography.caption, color: Colors.warning, fontWeight: '700' as const },

  attachmentBar: { marginTop: Spacing.xs, marginBottom: Spacing.sm },
  attachmentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.lavenderBg,
    borderRadius: Radius.md, padding: 8,
    borderWidth: 1, borderColor: Colors.lavenderLight,
  },
  attachmentPillIcon: { fontSize: 16 },
  attachmentPillName: { ...Typography.caption, color: Colors.textPrimary, flex: 1, fontWeight: '600' as const },
  attachmentViewBtn: { ...Typography.micro, color: Colors.lavender, fontWeight: '800' as const },

  noAttachmentBtn: {
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' as const,
    alignItems: 'center', backgroundColor: Colors.surfaceSecondary,
  },
  noAttachmentText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600' as const },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: Spacing.xs },
  actionBtnSecondary: {
    flex: 1, backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnTextSecondary: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600' as const },
  actionBtnPrimary: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingVertical: 8,
    alignItems: 'center', ...Shadows.xs,
  },
  actionBtnTextPrimary: { ...Typography.caption, color: '#fff', fontWeight: '700' as const },

  emptyWrap: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary },
  emptySub: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,8,30,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.md },
  modalCard: { width: '100%' as any, maxWidth: 650, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, maxHeight: '90%' as any, ...Shadows.lg },
  modalCardWide: { maxWidth: 750 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  modalCategory: { ...Typography.micro, color: Colors.primary, fontWeight: '700' as const, textTransform: 'uppercase' as const },
  modalTitle: { ...Typography.h2, color: Colors.textPrimary, marginTop: 2 },
  modalCloseBtn: { padding: 4, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.sm },
  modalCloseText: { color: Colors.textMuted, fontSize: 16, fontWeight: '700' as const },

  modalScroll: { flexShrink: 1 },
  modalBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, padding: Spacing.sm, borderRadius: Radius.md, marginBottom: Spacing.md },
  modalRisk: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600' as const },

  modalSectionTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  modalBody: { ...Typography.body, color: Colors.textSecondary, lineHeight: 20 },

  labsWrap: { marginTop: Spacing.xs },
  labRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  labKey: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' as const },
  labVal: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '700' as const },

  notesBox: { backgroundColor: Colors.goldBg, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '40' },
  notesTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 4 },
  notesBody: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },

  recsBox: { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.mint + '40' },
  recsTitle: { ...Typography.bodyBold, color: Colors.mint, marginBottom: 6 },
  recItem: { ...Typography.caption, color: Colors.textPrimary, lineHeight: 20, marginBottom: 2 },

  evidenceSection: { marginTop: Spacing.md },
  evidenceCard: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  evidenceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  evidenceFileName: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '700' as const },
  changeLinkBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  changeLinkText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' as const },
  evidenceImagePreview: { width: '100%' as any, height: 220, borderRadius: Radius.md, marginVertical: Spacing.xs },
  pdfCardWrap: { backgroundColor: Colors.coralBg, padding: Spacing.lg, borderRadius: Radius.md, alignItems: 'center', marginVertical: Spacing.xs },
  pdfIcon: { ...Typography.h3, color: Colors.danger },
  pdfText: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  openUrlBtn: { backgroundColor: Colors.lavenderBg, borderRadius: Radius.full, paddingVertical: 8, alignItems: 'center', marginTop: Spacing.xs, borderWidth: 1, borderColor: Colors.lavenderLight },
  openUrlText: { ...Typography.caption, color: Colors.lavender, fontWeight: '700' as const },

  noEvidenceWrap: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  noEvidenceText: { ...Typography.caption, color: Colors.textMuted },
  addEvidenceBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8 },
  addEvidenceBtnText: { ...Typography.caption, color: '#fff', fontWeight: '700' as const },

  modalFooter: { marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  modalExportBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 12, alignItems: 'center', ...Shadows.sm },
  modalExportBtnText: { ...Typography.bodyBold, color: '#fff' },

  // Add / Attach Form Inputs
  inputLabel: { ...Typography.micro, color: Colors.textMuted, marginTop: Spacing.sm, marginBottom: 4, fontWeight: '700' as const },
  readOnlyTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  textInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, ...Typography.body },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { ...Typography.caption, color: Colors.textSecondary },
  typeBtnTextActive: { color: '#fff', fontWeight: '700' as const },

  chipSelect: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border },
  chipSelectActive: { backgroundColor: Colors.lavenderBg, borderColor: Colors.lavender },
  chipSelectText: { ...Typography.caption, color: Colors.textSecondary },
  chipSelectTextActive: { color: Colors.lavender, fontWeight: '700' as const },

  miniChip: { flex: 1, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  miniChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  miniChipText: { ...Typography.micro, color: Colors.textSecondary },
  miniChipTextActive: { color: '#fff', fontWeight: '700' as const },

  uploadSectionBox: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  pickFileBtn: { backgroundColor: Colors.lavenderBg, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.lavender, borderStyle: 'dashed' as const },
  pickFileBtnText: { ...Typography.bodyBold, color: Colors.lavender },
  fileSelectedBox: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm, marginTop: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  fileNameText: { ...Typography.captionBold, color: Colors.textPrimary },
  fileTypeText: { ...Typography.micro, color: Colors.textMuted },
  orText: { ...Typography.micro, color: Colors.textMuted, textAlign: 'center', marginVertical: 6 },

  presetGroup: { gap: 6 },
  presetChip: { backgroundColor: Colors.lavenderBg, padding: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.lavenderLight },
  presetChipText: { ...Typography.caption, color: Colors.lavender, fontWeight: '600' as const },
  saveAttachBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 12, alignItems: 'center', marginTop: Spacing.md },
  saveAttachBtnText: { ...Typography.bodyBold, color: '#fff' },

  // Export Modal
  exportSub: { ...Typography.caption, color: Colors.textMuted },
  exportList: { gap: Spacing.sm, marginTop: Spacing.md },
  exportOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  exportIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  exportOptionIcon: { fontSize: 20 },
  exportOptionTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  exportOptionDesc: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  exportArrow: { fontSize: 24, color: Colors.textMuted, fontWeight: '300' as const },
});
