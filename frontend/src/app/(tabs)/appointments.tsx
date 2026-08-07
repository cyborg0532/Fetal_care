import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { apiFetch } from '../../services/api';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge, EmptyState } from '../../components/PremiumUI';

interface Appointment {
  id: number;
  title: string;
  doctor_name: string;
  date_time: string;
  notes: string;
  trimester: number;
  checklist_items: Array<{ item: string; checked: boolean }>;
}

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    title: '', doctor_name: '', date_time: '', notes: '', trimester: '1',
  });

  const fetchAppointments = useCallback(async () => {
    try {
      const data = await apiFetch('/appointments/');
      setAppointments(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAppointments(); }, []);

  const openNew = () => {
    setSelectedAppt(null);
    setForm({ title: '', doctor_name: '', date_time: new Date().toISOString(), notes: '', trimester: '1' });
    setModalVisible(true);
  };
  const openEdit = (a: Appointment) => {
    setSelectedAppt(a);
    setForm({ title: a.title, doctor_name: a.doctor_name ?? '', date_time: a.date_time, notes: a.notes ?? '', trimester: String(a.trimester) });
    setModalVisible(true);
  };
  const saveAppointment = async () => {
    if (!form.title) return Alert.alert('Missing', 'Please enter a title');
    try {
      const body = { ...form, trimester: parseInt(form.trimester) };
      if (selectedAppt) await apiFetch(`/appointments/${selectedAppt.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await apiFetch('/appointments/', { method: 'POST', body: JSON.stringify(body) });
      setModalVisible(false); fetchAppointments();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };
  const deleteAppt = async (id: number) => {
    Alert.alert('Delete?', 'Remove this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await apiFetch(`/appointments/${id}`, { method: 'DELETE' }); fetchAppointments(); } }
    ]);
  };
  const toggleChecklistItem = async (appt: Appointment, index: number) => {
    const updated = appt.checklist_items.map((it, i) => i === index ? { ...it, checked: !it.checked } : it);
    await apiFetch(`/appointments/${appt.id}`, { method: 'PUT', body: JSON.stringify({ ...appt, checklist_items: updated }) });
    fetchAppointments();
  };

  const TRIM_COLORS = ['', Colors.teal, Colors.lavender, Colors.primary];
  const TRIM_LABELS = ['', 'First Trimester', 'Second Trimester', 'Third Trimester'];

  if (loading) {
    return (
      <DashboardLayout title="Appointments">
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </DashboardLayout>
    );
  }

  const upcoming = appointments.filter(a => new Date(a.date_time) >= new Date());
  const past = appointments.filter(a => new Date(a.date_time) < new Date());

  return (
    <DashboardLayout title="Appointments">
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.inner}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAppointments(); }} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.pageHeader}>
            <View>
              <Text style={styles.pageTitle}>📅 Appointments</Text>
              <Text style={styles.pageSub}>{appointments.length} total · {upcoming.length} upcoming</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openNew}>
              <Text style={styles.addBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            {[
              { label: 'Upcoming', value: upcoming.length, color: Colors.teal },
              { label: 'Completed', value: past.length, color: Colors.mint },
              { label: 'This Month', value: appointments.filter(a => new Date(a.date_time).getMonth() === new Date().getMonth()).length, color: Colors.lavender },
            ].map((s, i) => (
              <View key={i} style={[styles.statChip, { borderColor: s.color + '40' }]}>
                <Text style={[styles.statChipValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statChipLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {appointments.length === 0 && (
            <EmptyState
              emoji="📋"
              title="No Appointments"
              subtitle="Add your first prenatal appointment to stay organized and never miss a checkup."
              action="+ Add Appointment"
              onAction={openNew}
            />
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <SectionHeader title="Upcoming" icon="🔜" />
          )}
          {upcoming.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              trimColor={TRIM_COLORS[a.trimester]}
              trimLabel={TRIM_LABELS[a.trimester]}
              onEdit={() => openEdit(a)}
              onDelete={() => deleteAppt(a.id)}
              onToggleCheck={(i) => toggleChecklistItem(a, i)}
            />
          ))}

          {/* Past */}
          {past.length > 0 && (
            <SectionHeader title="Past Appointments" icon="📂" />
          )}
          {past.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              trimColor={TRIM_COLORS[a.trimester]}
              trimLabel={TRIM_LABELS[a.trimester]}
              onEdit={() => openEdit(a)}
              onDelete={() => deleteAppt(a.id)}
              onToggleCheck={(i) => toggleChecklistItem(a, i)}
              isPast
            />
          ))}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>

        {/* Add/Edit Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedAppt ? '✏️ Edit Appointment' : '📅 New Appointment'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { label: 'Appointment Title *', key: 'title', placeholder: 'e.g. First Trimester Checkup' },
                  { label: 'Doctor Name', key: 'doctor_name', placeholder: 'e.g. Dr. Priya Sharma' },
                  { label: 'Date & Time (ISO)', key: 'date_time', placeholder: '2027-07-15T10:00:00' },
                  { label: 'Notes', key: 'notes', placeholder: 'Any notes...' },
                ].map(({ label, key, placeholder }) => (
                  <View key={key} style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{label}</Text>
                    <TextInput
                      style={[styles.input, key === 'notes' && { minHeight: 80, textAlignVertical: 'top' }]}
                      placeholder={placeholder}
                      placeholderTextColor={Colors.textMuted}
                      value={(form as any)[key]}
                      onChangeText={(v) => setForm(f => ({ ...f, [key]: v }))}
                      multiline={key === 'notes'}
                    />
                  </View>
                ))}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Trimester</Text>
                  <View style={styles.trimesterRow}>
                    {[['1', 'T1 · First', Colors.teal], ['2', 'T2 · Second', Colors.lavender], ['3', 'T3 · Third', Colors.primary]].map(([val, lbl, col]) => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.trimBtn, form.trimester === val && { borderColor: col as string, backgroundColor: (col as string) + '18' }]}
                        onPress={() => setForm(f => ({ ...f, trimester: val as string }))}
                      >
                        <Text style={[styles.trimBtnText, form.trimester === val && { color: col as string, fontWeight: '700' as const }]}>{lbl}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={saveAppointment}>
                  <Text style={styles.saveBtnText}>Save Appointment</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </DashboardLayout>
  );
}

function AppointmentCard({ appt, trimColor, trimLabel, onEdit, onDelete, onToggleCheck, isPast }: {
  appt: Appointment;
  trimColor: string;
  trimLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCheck: (i: number) => void;
  isPast?: boolean;
}) {
  const dt = new Date(appt.date_time);
  const [expanded, setExpanded] = useState(false);
  const checkedCount = appt.checklist_items?.filter(i => i.checked).length ?? 0;

  return (
    <View style={[styles.apptCard, isPast && styles.apptCardPast, { borderLeftColor: trimColor }]}>
      <TouchableOpacity style={styles.apptCardMain} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        {/* Date box */}
        <View style={[styles.dateBox, { backgroundColor: trimColor + '15' }]}>
          <Text style={[styles.dateDay, { color: trimColor }]}>{dt.getDate()}</Text>
          <Text style={[styles.dateMon, { color: trimColor }]}>{dt.toLocaleString('default', { month: 'short' })}</Text>
          <Text style={styles.dateTime}>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        {/* Info */}
        <View style={styles.apptInfo}>
          <View style={styles.apptInfoTop}>
            <Text style={styles.apptTitle}>{appt.title}</Text>
            <View style={[styles.trimBadge, { backgroundColor: trimColor + '18' }]}>
              <Text style={[styles.trimBadgeText, { color: trimColor }]}>{trimLabel.split(' ')[0]}</Text>
            </View>
          </View>
          {appt.doctor_name ? (
            <Text style={styles.apptDoctor}>👩‍⚕️ Dr. {appt.doctor_name}</Text>
          ) : null}
          {appt.checklist_items?.length > 0 && (
            <Text style={styles.checklistProgress}>
              ✓ {checkedCount}/{appt.checklist_items.length} checklist items
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.apptActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Expanded: notes + checklist */}
      {expanded && (
        <View style={styles.apptExpanded}>
          {appt.notes ? (
            <Text style={styles.apptNotes}>{appt.notes}</Text>
          ) : null}
          {appt.checklist_items?.length > 0 && (
            <View style={styles.checklistBox}>
              <Text style={styles.checklistTitle}>Pre-visit Checklist</Text>
              {appt.checklist_items.map((item, i) => (
                <TouchableOpacity key={i} style={styles.checkItem} onPress={() => onToggleCheck(i)}>
                  <View style={[styles.checkbox, item.checked && { backgroundColor: Colors.mint, borderColor: Colors.mint }]}>
                    {item.checked && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={[styles.checkText, item.checked && styles.checkTextDone]}>{item.item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: Spacing.md, marginTop: Spacing.sm,
  },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 18, paddingVertical: 9,
    ...Shadows.sm,
  },
  addBtnText: { ...Typography.bodyBold, color: '#fff', fontSize: 13 },

  statsStrip: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statChip: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.xs,
  },
  statChipValue: { ...Typography.h2, fontWeight: '800' as const },
  statChipLabel: { ...Typography.micro, color: Colors.textMuted, marginTop: 2 },

  apptCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4, overflow: 'hidden' as any,
    ...Shadows.sm,
  },
  apptCardPast: { opacity: 0.7 },
  apptCardMain: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, gap: Spacing.md },

  dateBox: {
    borderRadius: Radius.md, padding: Spacing.xs,
    alignItems: 'center', minWidth: 54,
  },
  dateDay: { fontSize: 24, fontWeight: '800' as const },
  dateMon: { ...Typography.micro, fontWeight: '700' as const },
  dateTime: { ...Typography.micro, color: Colors.textMuted, marginTop: 2 },

  apptInfo: { flex: 1 },
  apptInfoTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4, flexWrap: 'wrap' as const },
  apptTitle: { ...Typography.bodyBold, color: Colors.textPrimary, flex: 1 },
  trimBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  trimBadgeText: { ...Typography.micro, fontWeight: '700' as const },
  apptDoctor: { ...Typography.caption, color: Colors.textMuted, marginBottom: 4 },
  checklistProgress: { ...Typography.micro, color: Colors.mint, fontWeight: '600' as const },

  apptActions: { gap: 6 },
  actionBtn: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnText: { fontSize: 14 },

  apptExpanded: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceSecondary,
  },
  apptNotes: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.sm },

  checklistBox: {},
  checklistTitle: { ...Typography.label, color: Colors.textMuted, marginBottom: Spacing.sm },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
  checkText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
  checkTextDone: { textDecorationLine: 'line-through', color: Colors.textMuted },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,10,46,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.backgroundAlt, borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl, padding: Spacing.lg, maxHeight: '92%' as any,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  modalTitle: { ...Typography.h3, color: Colors.textPrimary },
  modalClose: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  modalCloseText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' as const },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
    padding: Spacing.md, color: Colors.textPrimary,
    ...Typography.body, borderWidth: 1, borderColor: Colors.border,
  },
  trimesterRow: { flexDirection: 'row', gap: Spacing.sm },
  trimBtn: {
    flex: 1, backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md, padding: Spacing.sm,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  trimBtnText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '500' as const },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
    marginBottom: Spacing.xl, ...Shadows.sm,
  },
  saveBtnText: { ...Typography.bodyBold, color: '#fff', fontSize: 15 },
});
