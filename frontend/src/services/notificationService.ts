import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MedicineReminder } from '../types/medicine';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medicine-reminders', {
        name: 'Medicine Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      });
    }

    return true;
  }

  /**
   * Schedule notifications for a medicine reminder
   */
  static async scheduleReminder(reminder: MedicineReminder): Promise<string[]> {
    const notificationIds: string[] = [];
    const [hours, minutes] = reminder.time.split(':').map(Number);

    try {
      if (reminder.repeat === 'daily') {
        // Schedule daily notification
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '💊 Time to take your medicine',
            body: `${reminder.medicineName}\n${reminder.dosage}${reminder.notes ? `\n${reminder.notes}` : ''}`,
            data: { reminderId: reminder.id, type: 'medicine' },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
          } as Notifications.NotificationTriggerInput,
        });
        notificationIds.push(id);
      } else if (reminder.repeat === 'custom' && reminder.selectedDays) {
        // Schedule for selected days
        for (const day of reminder.selectedDays) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: '💊 Time to take your medicine',
              body: `${reminder.medicineName}\n${reminder.dosage}${reminder.notes ? `\n${reminder.notes}` : ''}`,
              data: { reminderId: reminder.id, type: 'medicine' },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: day + 1, // 1-7 for Sunday-Saturday
              hour: hours,
              minute: minutes,
            } as Notifications.NotificationTriggerInput,
          });
          notificationIds.push(id);
        }
      }

      return notificationIds;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel notifications by IDs
   */
  static async cancelNotifications(notificationIds: string[]): Promise<void> {
    try {
      await Promise.all(
        notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id))
      );
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Schedule a snooze notification (10 minutes)
   */
  static async scheduleSnooze(reminder: MedicineReminder): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Medicine Reminder (Snoozed)',
        body: `${reminder.medicineName}\n${reminder.dosage}${reminder.notes ? `\n${reminder.notes}` : ''}`,
        data: { reminderId: reminder.id, type: 'medicine-snooze' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 600, // 10 minutes
        repeats: false,
      } as Notifications.NotificationTriggerInput,
    });
    return id;
  }
}
