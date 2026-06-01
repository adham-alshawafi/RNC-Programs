/**
 * Types and interfaces for Student Attendance Tracker
 */

export interface Student {
  id: string;
  name: string;
  sectionId: string;
  intake?: string; // e.g. "Jan 2026", "June 2026"
}

export interface Program {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface Section {
  id: string;
  name: string;
  programId: string; // Belongs to a Program (e.g. English Bridge Program, Vibe Coding)
  isCustom?: boolean; // true if created by user, false for initial ones
}

export type AttendanceStatus = 'present' | 'absent';

// Key format: YYYY-MM-DD
export type DateKey = string;

// Map of DateKey -> StudentId -> AttendanceStatus
export type AttendanceMap = Record<DateKey, Record<string, AttendanceStatus>>;

// Map of DateKey -> StudentId -> string (note explanation)
export type AttendanceNotesMap = Record<DateKey, Record<string, string>>;

// Overall app state to save/load from localStorage
export interface AppState {
  sections: Section[];
  students: Student[];
  attendance: AttendanceMap; // Map date -> studentId -> status
  attendanceNotes?: AttendanceNotesMap; // Map date -> studentId -> note
  markedDates: Record<string, DateKey[]>; // Map sectionId -> array of DateKeys
}
