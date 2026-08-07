import { useState, useEffect, useCallback } from 'react';
import { MedicineReminder, MedicineLog, MedicineDashboardStats } from '../types/medicine';
import { MedicineStorageService } from '../services/medicineStorageService';
import { NotificationService } from '../services/notificationService';

export function useMedicineReminders() {
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [logs, setLogs] = useState<MedicineLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Load reminders and logs
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [loadedReminders, loadedLogs] = await Promise.all([
        MedicineStorageService.getReminders(),
        MedicineStorageService.getLogs(),
      ]);
      setReminders(loadedReminders);
      setLogs(loadedLogs);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add a new reminder
  const addReminder = useCallback(async (reminder: Omit<MedicineReminder, 'id' | 'createdAt' | 'updatedAt' | 'notificationIds'>) => {
    try {
      const newReminder: MedicineReminder = {
        ...reminder,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notificationIds: [],
      };

      // Schedule notifications if enabled
      if (newReminder.enabled) {
        const notificationIds = await NotificationService.scheduleReminder(newReminder);
        newReminder.notificationIds = notificationIds;
      }

      await MedicineStorageService.addReminder(newReminder);
      setReminders((prev) => [...prev, newReminder]);
      return newReminder;
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  }, []);

  // Update a reminder
  const updateReminder = useCallback(async (id: string, updates: Partial<MedicineReminder>) => {
    try {
      const existing = reminders.find((r) => r.id === id);
      if (!existing) throw new Error('Reminder not found');

      // Cancel old notifications
      if (existing.notificationIds.length > 0) {
        await NotificationService.cancelNotifications(existing.notificationIds);
      }

      const updatedReminder: MedicineReminder = {
        ...existing,
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
      };

      // Schedule new notifications if enabled
      if (updatedReminder.enabled) {
        const notificationIds = await NotificationService.scheduleReminder(updatedReminder);
        updatedReminder.notificationIds = notificationIds;
      } else {
        updatedReminder.notificationIds = [];
      }

      await MedicineStorageService.updateReminder(updatedReminder);
      setReminders((prev) => prev.map((r) => (r.id === id ? updatedReminder : r)));
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  }, [reminders]);

  // Delete a reminder
  const deleteReminder = useCallback(async (id: string) => {
    try {
      const reminder = reminders.find((r) => r.id === id);
      if (reminder && reminder.notificationIds.length > 0) {
        await NotificationService.cancelNotifications(reminder.notificationIds);
      }

      await MedicineStorageService.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  }, [reminders]);

  // Toggle reminder enabled/disabled
  const toggleReminder = useCallback(async (id: string) => {
    const reminder = reminders.find((r) => r.id === id);
    if (reminder) {
      await updateReminder(id, { enabled: !reminder.enabled });
    }
  }, [reminders, updateReminder]);

  // Log medicine taken
  const logMedicineTaken = useCallback(async (reminderId: string, notes?: string) => {
    try {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (!reminder) return;

      const log: MedicineLog = {
        id: Date.now().toString(),
        reminderId,
        medicineName: reminder.medicineName,
        dosage: reminder.dosage,
        scheduledTime: new Date().toISOString(),
        actualTime: new Date().toISOString(),
        status: 'taken',
        notes,
      };

      await MedicineStorageService.addLog(log);
      setLogs((prev) => [...prev, log]);
    } catch (error) {
      console.error('Error logging medicine:', error);
      throw error;
    }
  }, [reminders]);

  // Snooze a reminder
  const snoozeReminder = useCallback(async (reminderId: string) => {
    try {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (!reminder) return;

      await NotificationService.scheduleSnooze(reminder);

      const log: MedicineLog = {
        id: Date.now().toString(),
        reminderId,
        medicineName: reminder.medicineName,
        dosage: reminder.dosage,
        scheduledTime: new Date().toISOString(),
        status: 'snoozed',
      };

      await MedicineStorageService.addLog(log);
      setLogs((prev) => [...prev, log]);
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      throw error;
    }
  }, [reminders]);

  // Get dashboard stats
  const getDashboardStats = useCallback((): MedicineDashboardStats => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter((log) => log.scheduledTime.startsWith(today));
    const enabledReminders = reminders.filter((r) => r.enabled);

    const taken = todayLogs.filter((log) => log.status === 'taken').length;
    const missed = todayLogs.filter((log) => log.status === 'missed').length;
    const total = enabledReminders.length;
    const remaining = Math.max(0, total - taken);

    return {
      today: {
        total,
        taken,
        remaining,
        missed,
      },
      upcomingToday: enabledReminders,
    };
  }, [reminders, logs]);

  return {
    reminders,
    logs,
    loading,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    logMedicineTaken,
    snoozeReminder,
    getDashboardStats,
    refresh: loadData,
  };
}
