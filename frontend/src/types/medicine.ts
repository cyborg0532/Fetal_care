// Medicine Reminder Types
export interface MedicineReminder {
  id: string;
  medicineName: string;
  dosage: string;
  time: string; // HH:mm format
  repeat: RepeatType;
  selectedDays?: number[]; // 0-6 for Sunday-Saturday
  startDate: string; // ISO date
  endDate?: string; // ISO date, optional
  notes?: string;
  enabled: boolean;
  notificationIds: string[]; // Store notification IDs for cancellation
  createdAt: string;
  updatedAt: string;
}

export type RepeatType = 'daily' | 'custom';

export interface MedicineLog {
  id: string;
  reminderId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string; // ISO datetime
  actualTime?: string; // ISO datetime when taken
  status: 'taken' | 'missed' | 'snoozed';
  notes?: string;
}

export interface MedicineDashboardStats {
  today: {
    total: number;
    taken: number;
    remaining: number;
    missed: number;
  };
  upcomingToday: MedicineReminder[];
}
