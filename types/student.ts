export interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
  hasTicket: boolean;
  ticketNumber?: string;
  ticketNumbers?: string[]; // Array of all ticket numbers
  isValidated?: boolean;
  validatedAt?: string; // ISO timestamp
  validatedBy?: string; // Device/scanner ID
  ticketCount?: number;
  guestName?: string;
  guestSchool?: string;
}

export interface ValidationRecord {
  studentId: string;
  ticketNumber: string;
  validatedAt: string;
  validatedBy: string;
  deviceId: string;
  eventId: string;
}

export interface SyncData {
  students: Student[];
  validations: ValidationRecord[];
  lastSync: string;
  eventId: string;
}