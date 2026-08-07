import AsyncStorage from '@react-native-async-storage/async-storage';
import { MedicineReminder, MedicineLog } from '../types/medicine';

const REMINDERS_KEY = '@medicine_reminders';
const LOGS_KEY = '@medicine_logs';

export class MedicineStorageService {
  /**
   * Save all reminders
   */
  static async saveReminders(reminders: MedicineReminder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving reminders:', error);
      throw error;
    }
  }

  /**
   * Get all reminders
   */
  static async getReminders(): Promise<MedicineReminder[]> {
    try {
      const data = await AsyncStorage.getItem(REMINDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting reminders:', error);
      return [];
    }
  }

  /**
   * Add a new reminder
   */
  static async addReminder(reminder: MedicineReminder): Promise<void> {
    const reminders = await this.getReminders();
    reminders.push(reminder);
    await this.saveReminders(reminders);
  }

  /**
   * Update a reminder
   */
  static async updateReminder(updatedReminder: MedicineReminder): Promise<void> {
    const reminders = await this.getReminders();
    const index = reminders.findIndex((r) => r.id === updatedReminder.id);
    if (index !== -1) {
      reminders[index] = updatedReminder;
      await this.saveReminders(reminders);
    }
  }

  /**
   * Delete a reminder
   */
  static async deleteReminder(id: string): Promise<void> {
    const reminders = await this.getReminders();
    const filtered = reminders.filter((r) => r.id !== id);
    await this.saveReminders(filtered);
  }

  /**
   * Get reminder by ID
   */
  static async getReminderById(id: string): Promise<MedicineReminder | null> {
    const reminders = await this.getReminders();
    return reminders.find((r) => r.id === id) || null;
  }

  /**
   * Save all logs
   */
  static async saveLogs(logs: MedicineLog[]): Promise<void> {
    try {
      await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving logs:', error);
      throw error;
    }
  }

  /**
   * Get all logs
   */
  static async getLogs(): Promise<MedicineLog[]> {
    try {
      const data = await AsyncStorage.getItem(LOGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting logs:', error);
      return [];
    }
  }

  /**
   * Add a log entry
   */
  static async addLog(log: MedicineLog): Promise<void> {
    const logs = await this.getLogs();
    logs.push(log);
    await this.saveLogs(logs);
  }

  /**
   * Get logs for a specific date
   */
  static async getLogsForDate(date: string): Promise<MedicineLog[]> {
    const logs = await this.getLogs();
    return logs.filter((log) => log.scheduledTime.startsWith(date));
  }

  /**
   * Get logs for today
   */
  static async getTodayLogs(): Promise<MedicineLog[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getLogsForDate(today);
  }

  /**
   * Get logs for a specific reminder
   */
  static async getLogsForReminder(reminderId: string): Promise<MedicineLog[]> {
    const logs = await this.getLogs();
    return logs.filter((log) => log.reminderId === reminderId);
  }

  /**
   * Clear all data (for testing)
   */
  static async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([REMINDERS_KEY, LOGS_KEY]);
  }
}
