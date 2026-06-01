import { Section, Student, AttendanceMap, Program } from './types';

export const INITIAL_PROGRAMS: Program[] = [
  { id: 'prog-english', name: 'English Bridge Program', isCustom: false },
  { id: 'prog-vibe', name: 'Vibe Coding', isCustom: false }
];

export const INITIAL_SECTIONS: Section[] = [
  { id: 'sec-beginner', name: 'Beginner', programId: 'prog-english', isCustom: false },
  { id: 'sec-pre-starter', name: 'Pre-starter', programId: 'prog-english', isCustom: false },
  { id: 'sec-starter', name: 'Starter', programId: 'prog-english', isCustom: false },
  { id: 'sec-elementary', name: 'Elementary', programId: 'prog-english', isCustom: false },
  { id: 'sec-pre-int', name: 'Pre-Intermediate', programId: 'prog-english', isCustom: false },
  { id: 'sec-intermediate', name: 'Intermediate', programId: 'prog-english', isCustom: false },
  { id: 'sec-vibe-coding', name: 'Vibe Coding', programId: 'prog-vibe', isCustom: false },
];

export const INITIAL_STUDENTS: Student[] = [
  // Beginner
  { id: 'std-1', name: 'Alice Smith', sectionId: 'sec-beginner' },
  { id: 'std-2', name: 'Bob Johnson', sectionId: 'sec-beginner' },
  { id: 'std-3', name: 'Charlie Brown', sectionId: 'sec-beginner' },
  
  // Pre-starter
  { id: 'std-ps1', name: 'Diana Prince', sectionId: 'sec-pre-starter' },
  { id: 'std-ps2', name: 'Bruce Wayne', sectionId: 'sec-pre-starter' },
  
  // Starter
  { id: 'std-4', name: 'Daniel Craig', sectionId: 'sec-starter' },
  { id: 'std-5', name: 'Emily Blunt', sectionId: 'sec-starter' },
  
  // Elementary
  { id: 'std-6', name: 'Fiona Gallagher', sectionId: 'sec-elementary' },
  { id: 'std-7', name: 'Gary Oldman', sectionId: 'sec-elementary' },
  { id: 'std-8', name: 'Hannah Abbott', sectionId: 'sec-elementary' },
  
  // Pre-Intermediate
  { id: 'std-9', name: 'Ian McKellen', sectionId: 'sec-pre-int' },
  { id: 'std-10', name: 'Julia Roberts', sectionId: 'sec-pre-int' },
  
  // Intermediate
  { id: 'std-11', name: 'Kevin Hart', sectionId: 'sec-intermediate' },
  { id: 'std-12', name: 'Laura Bailey', sectionId: 'sec-intermediate' },
  { id: 'std-13', name: 'Michael Jordan', sectionId: 'sec-intermediate' },
  
  // Vibe Coding
  { id: 'std-14', name: 'Ada Lovelace', sectionId: 'sec-vibe-coding' },
  { id: 'std-15', name: 'Alan Turing', sectionId: 'sec-vibe-coding' },
  { id: 'std-16', name: 'Linus Torvalds', sectionId: 'sec-vibe-coding' },
  { id: 'std-17', name: 'Grace Hopper', sectionId: 'sec-vibe-coding' },
  { id: 'std-18', name: 'Dennis Ritchie', sectionId: 'sec-vibe-coding' },
];

// Let's pre-populate some attendance data for active feel! (last 3 school days before today)
// Today in the workspace is: 2026-05-31
export const getInitialAttendance = (): AttendanceMap => {
  const dates = ['2026-05-28', '2026-05-29', '2026-05-30'];
  const attendance: AttendanceMap = {};

  dates.forEach(date => {
    attendance[date] = {};
    INITIAL_STUDENTS.forEach((student, index) => {
      // Semi-random: present 80% of the time, absent 20%
      const rand = (index * 7 + date.charCodeAt(date.length - 1)) % 10;
      attendance[date][student.id] = rand < 8 ? 'present' : 'absent';
    });
  });

  return attendance;
};

export const INITIAL_MARKED_DATES = {
  'sec-beginner': ['2026-05-28', '2026-05-29', '2026-05-30'],
  'sec-pre-starter': ['2026-05-28', '2026-05-29', '2026-05-30'],
  'sec-starter': ['2026-05-28', '2026-05-29', '2026-05-30'],
  'sec-elementary': ['2026-05-28', '2026-05-29', '2026-05-30'],
  'sec-pre-int': ['2026-05-28', '2026-05-29', '2026-05-30'],
  'sec-intermediate': ['2026-05-28', '2026-05-29', '2026-05-30'],
  'sec-vibe-coding': ['2026-05-28', '2026-05-29', '2026-05-30'],
};
