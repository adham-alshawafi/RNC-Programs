import { useState, useEffect, FormEvent } from 'react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  AlertTriangle, 
  Check, 
  Clock, 
  ArrowRightLeft,
  Sparkles,
  Folder,
  FolderOpen,
  FolderPlus,
  BookOpen,
  Filter,
  ChevronsUpDown,
  Grid,
  LogOut,
  UserX,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Custom components
import StudentManager from './components/StudentManager';
import CalendarAttendance from './components/CalendarAttendance';
import AttendanceCalculator from './components/AttendanceCalculator';
import WeeklyGrid from './components/WeeklyGrid';
import Auth, { UserAccount } from './components/Auth';
import MonthlyBoard from './components/MonthlyBoard';
import IntakeBoard from './components/IntakeBoard';
import StudentCalendarView from './components/StudentCalendarView';
import { logout as firebaseLogout } from './lib/firebaseAuth';

// Types & Initial Data
import { Student, Section, AttendanceMap, AttendanceStatus, AttendanceNotesMap, Program } from './types';
import { 
  INITIAL_SECTIONS, 
  INITIAL_STUDENTS, 
  getInitialAttendance, 
  INITIAL_MARKED_DATES,
  INITIAL_PROGRAMS
} from './initialData';

export default function App() {
  // 0. User session & Credentials state
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('attendance_registered_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    const sessionExpiry = localStorage.getItem('attendance_session_expires_at');
    
    if (savedUser && sessionExpiry) {
      if (Date.now() < parseInt(sessionExpiry)) {
        return JSON.parse(savedUser);
      } else {
        localStorage.removeItem('attendance_current_user');
        localStorage.removeItem('attendance_session_expires_at');
      }
    }
    return null;
  });

  const handleLoginSuccess = (user: UserAccount, remember: boolean) => {
    setCurrentUser(user);
    localStorage.setItem('attendance_current_user', JSON.stringify(user));
    // Checkbox longevity: if Checked/remember -> 7 days, else 1 hour
    const duration = remember ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    localStorage.setItem('attendance_session_expires_at', (Date.now() + duration).toString());

    // Securely pull isolated states for this specific logged in user session
    const email = user.email.toLowerCase().trim();
    
    const savedProgs = localStorage.getItem(`attendance_${email}_programs`);
    setPrograms(savedProgs ? JSON.parse(savedProgs) : []);

    const savedExpanded = localStorage.getItem(`attendance_${email}_expanded_programs`);
    setExpandedPrograms(savedExpanded ? JSON.parse(savedExpanded) : {});

    const savedSections = localStorage.getItem(`attendance_${email}_sections`);
    setSections(savedSections ? JSON.parse(savedSections) : []);

    const savedStudents = localStorage.getItem(`attendance_${email}_students`);
    setStudents(savedStudents ? JSON.parse(savedStudents) : []);

    const savedAttendance = localStorage.getItem(`attendance_${email}_map`);
    setAttendance(savedAttendance ? JSON.parse(savedAttendance) : {});

    const savedMarked = localStorage.getItem(`attendance_${email}_marked_dates`);
    setMarkedDates(savedMarked ? JSON.parse(savedMarked) : {});

    const savedSubmitted = localStorage.getItem(`attendance_${email}_submitted_dates`);
    setSubmittedDates(savedSubmitted ? JSON.parse(savedSubmitted) : {});

    const savedHolidays = localStorage.getItem(`attendance_${email}_holidays`);
    setHolidays(savedHolidays ? JSON.parse(savedHolidays) : {});

    const savedNotes = localStorage.getItem(`attendance_${email}_notes`);
    setAttendanceNotes(savedNotes ? JSON.parse(savedNotes) : {});

    const savedActiveSecId = localStorage.getItem(`attendance_${email}_active_section_id`);
    setActiveSectionId(savedActiveSecId || '');
  };

  const handleLogout = () => {
    // Also sign out from Google/Firebase Auth to let user choose a different Google account on sign-in
    firebaseLogout().catch(err => console.error("Firebase logout error:", err));

    setCurrentUser(null);
    localStorage.removeItem('attendance_current_user');
    localStorage.removeItem('attendance_session_expires_at');

    // Wipe memory back to empty defaults so absolutely nothing leaks to the standard layout
    setPrograms([]);
    setExpandedPrograms({});
    setSections([]);
    setStudents([]);
    setAttendance({});
    setMarkedDates({});
    setSubmittedDates({});
    setHolidays({});
    setAttendanceNotes({});
    setActiveSectionId('');
  };

  const handleDeleteAccount = () => {
    if (!currentUser) return;
    const email = currentUser.email.toLowerCase().trim();

    // 1. Remove user from register list
    const updatedUsers = users.filter(u => u.email.toLowerCase().trim() !== email);
    setUsers(updatedUsers);
    localStorage.setItem('attendance_registered_users', JSON.stringify(updatedUsers));

    // 2. Erase user-specific isolated local storage keys
    localStorage.removeItem(`attendance_${email}_programs`);
    localStorage.removeItem(`attendance_${email}_expanded_programs`);
    localStorage.removeItem(`attendance_${email}_sections`);
    localStorage.removeItem(`attendance_${email}_students`);
    localStorage.removeItem(`attendance_${email}_map`);
    localStorage.removeItem(`attendance_${email}_marked_dates`);
    localStorage.removeItem(`attendance_${email}_submitted_dates`);
    localStorage.removeItem(`attendance_${email}_holidays`);
    localStorage.removeItem(`attendance_${email}_notes`);
    localStorage.removeItem(`attendance_${email}_active_section_id`);
    localStorage.removeItem(`attendance_${email}_custom_intakes`);

    // 3. Clear reset tokens specifically for this user
    const savedTokens = JSON.parse(localStorage.getItem('attendance_reset_tokens') || '{}');
    if (savedTokens[email]) {
      delete savedTokens[email];
      localStorage.setItem('attendance_reset_tokens', JSON.stringify(savedTokens));
    }

    // 4. Trigger logout for full memory flush
    handleLogout();
  };

  // 1. Core State - Empty by default for pristine first-time experiences
  const [programs, setPrograms] = useState<Program[]>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return [];
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_programs`);
    return saved ? JSON.parse(saved) : [];
  });

  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return {};
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_expanded_programs`);
    return saved ? JSON.parse(saved) : {};
  });

  const [sections, setSections] = useState<Section[]>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return [];
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_sections`);
    return saved ? JSON.parse(saved) : [];
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return [];
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_students`);
    return saved ? JSON.parse(saved) : [];
  });

  const [customIntakes, setCustomIntakes] = useState<string[]>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return ['Default Intake', 'May 2026', 'June 2026'];
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_custom_intakes`);
    return saved ? JSON.parse(saved) : ['Default Intake', 'May 2026', 'June 2026'];
  });

  const [attendance, setAttendance] = useState<AttendanceMap>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return {};
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_map`);
    return saved ? JSON.parse(saved) : {};
  });

  const [markedDates, setMarkedDates] = useState<Record<string, string[]>>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return {};
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_marked_dates`);
    return saved ? JSON.parse(saved) : {};
  });

  const [submittedDates, setSubmittedDates] = useState<Record<string, string[]>>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return {};
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_submitted_dates`);
    return saved ? JSON.parse(saved) : {};
  });

  const [holidays, setHolidays] = useState<Record<string, string[]>>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return {};
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_holidays`);
    return saved ? JSON.parse(saved) : {};
  });

  const [attendanceNotes, setAttendanceNotes] = useState<AttendanceNotesMap>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return {};
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_notes`);
    return saved ? JSON.parse(saved) : {};
  });

  // Navigation / Filter States
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return '';
    const email = JSON.parse(savedUser).email.toLowerCase().trim();
    const saved = localStorage.getItem(`attendance_${email}_active_section_id`);
    return saved || '';
  });

  const [activeTab, setActiveTab] = useState<'attendance' | 'weekly_grid' | 'monthly_board' | 'intake_board' | 'students' | 'calculator' | 'student_calendar'>('attendance');
  const [selectedDate, setSelectedDate] = useState<string>('2026-05-31'); // Current local time is 2026-05-31

  // Program & Section CRUD states
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editingProgramName, setEditingProgramName] = useState('');

  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [programToMergeId, setProgramToMergeId] = useState<string>('');

  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedProgramIdForNewSection, setSelectedProgramIdForNewSection] = useState<string>('');
  
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const [deletingSection, setDeletingSection] = useState<Section | null>(null);
  const [sectionToMergeId, setSectionToMergeId] = useState<string>('');

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Securely persist states to user-specific slots in LocalStorage on updates
  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_programs`, JSON.stringify(programs));
    }
  }, [programs, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_expanded_programs`, JSON.stringify(expandedPrograms));
    }
  }, [expandedPrograms, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_sections`, JSON.stringify(sections));
    }
  }, [sections, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_students`, JSON.stringify(students));
    }
  }, [students, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_custom_intakes`, JSON.stringify(customIntakes));
    }
  }, [customIntakes, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_map`, JSON.stringify(attendance));
    }
  }, [attendance, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_marked_dates`, JSON.stringify(markedDates));
    }
  }, [markedDates, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_submitted_dates`, JSON.stringify(submittedDates));
    }
  }, [submittedDates, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_holidays`, JSON.stringify(holidays));
    }
  }, [holidays, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_notes`, JSON.stringify(attendanceNotes));
    }
  }, [attendanceNotes, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase().trim();
      localStorage.setItem(`attendance_${email}_active_section_id`, activeSectionId);
    }
  }, [activeSectionId, currentUser]);

  // Find active section helper
  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

  // 1.5 Programs CRUD Actions
  const handleAddProgram = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = newProgramName.trim();
    if (!cleanName) return;

    const newId = `prog-${Date.now()}`;
    const newProg: Program = {
      id: newId,
      name: cleanName,
      isCustom: true,
    };

    setPrograms(prev => [...prev, newProg]);
    setNewProgramName('');
    setShowAddProgramModal(false);
  };

  const handleSaveEditProgram = (id: string) => {
    const cleanName = editingProgramName.trim();
    if (!cleanName) return;

    setPrograms(prev => prev.map(p => p.id === id ? { ...p, name: cleanName } : p));
    setEditingProgramId(null);
  };

  const handleConfirmDeleteProgram = (purgeAll: boolean) => {
    if (!deletingProgram) return;

    const targetSections = sections.filter(s => s.programId === deletingProgram.id);
    const targetSectionIds = targetSections.map(s => s.id);

    if (purgeAll) {
      // Delete all students under this program's sections
      setStudents(prev => prev.filter(std => !targetSectionIds.includes(std.sectionId)));
      
      // Cleanup marked & submitted dates for these sections
      setMarkedDates(prev => {
        const copy = { ...prev };
        targetSectionIds.forEach(id => delete copy[id]);
        return copy;
      });

      setSubmittedDates(prev => {
        const copy = { ...prev };
        targetSectionIds.forEach(id => delete copy[id]);
        return copy;
      });

      // Remove sections
      setSections(prev => prev.filter(s => s.programId !== deletingProgram.id));
    } else if (programToMergeId) {
      // Reassign sections to another program
      setSections(prev => prev.map(s => 
        s.programId === deletingProgram.id 
          ? { ...s, programId: programToMergeId } 
          : s
      ));
    }

    // Remove the program
    setPrograms(prev => prev.filter(p => p.id !== deletingProgram.id));

    // Cleanup active section focus if deleted
    if (purgeAll && targetSectionIds.includes(activeSectionId)) {
      const remainingSecs = sections.filter(s => s.programId !== deletingProgram.id);
      if (remainingSecs.length > 0) {
        setActiveSectionId(remainingSecs[0].id);
      } else {
        setActiveSectionId('');
      }
    }

    setDeletingProgram(null);
  };

  // 2. Section CRUD Actions
  const handleAddSection = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = newSectionName.trim();
    if (!cleanName) return;

    const progId = selectedProgramIdForNewSection || programs[0]?.id || '';
    if (!progId) return;

    const newId = `sec-${Date.now()}`;
    const newSec: Section = {
      id: newId,
      name: cleanName,
      programId: progId,
      isCustom: true,
    };

    setSections(prev => [...prev, newSec]);
    setActiveSectionId(newId);
    setNewSectionName('');
    setShowAddSectionModal(false);
  };

  const handleStartEditSection = (sec: Section) => {
    setEditingSectionId(sec.id);
    setEditingSectionName(sec.name);
  };

  const handleSaveEditSection = (id: string) => {
    const cleanName = editingSectionName.trim();
    if (!cleanName) return;

    setSections(prev => prev.map(s => s.id === id ? { ...s, name: cleanName } : s));
    setEditingSectionId(null);
  };

  const handleCancelEditSection = () => {
    setEditingSectionId(null);
  };

  const handleRequestDeleteSection = (sec: Section) => {
    // Determine check inside active section list
    const secsLeft = sections.filter(s => s.id !== sec.id);
    setDeletingSection(sec);
    if (secsLeft.length > 0) {
      setSectionToMergeId(secsLeft[0].id);
    } else {
      setSectionToMergeId('');
    }
  };

  const handleConfirmDeleteSection = (purgeStudents: boolean) => {
    if (!deletingSection) return;

    const targetStudents = students.filter(s => s.sectionId === deletingSection.id);

    if (purgeStudents) {
      // Purge: Wipe section's students and delete section
      setStudents(prev => prev.filter(s => s.sectionId !== deletingSection.id));
    } else if (sectionToMergeId) {
      // Merge: Reassign students to target merge section
      setStudents(prev => prev.map(s => 
        s.sectionId === deletingSection.id 
          ? { ...s, sectionId: sectionToMergeId } 
          : s
      ));
    }

    // Remove section
    setSections(prev => prev.filter(s => s.id !== deletingSection.id));

    // Cleanup marked dates list for this section
    setMarkedDates(prev => {
      const copy = { ...prev };
      delete copy[deletingSection.id];
      return copy;
    });

    // If active section was deleted, switch active focus
    if (activeSectionId === deletingSection.id) {
      const remainingSecs = sections.filter(s => s.id !== deletingSection.id);
      if (remainingSecs.length > 0) {
        setActiveSectionId(remainingSecs[0].id);
      }
    }

    setDeletingSection(null);
  };

  // 3. Student CRUD Actions
  const handleAddStudent = (name: string, sectionId: string, intake?: string) => {
    const newStudent: Student = {
      id: `std-${Date.now()}`,
      name,
      sectionId,
      intake: intake?.trim() || 'Default Intake',
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const handleAddStudentsBatch = (newStudentsList: { name: string; intake?: string }[]) => {
    setStudents(prev => {
      const added = newStudentsList.map((s, index) => ({
        id: `std-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        name: s.name,
        sectionId: activeSectionId,
        intake: s.intake?.trim() || 'Default Intake',
      }));
      return [...prev, ...added];
    });
  };

  const handleEditStudent = (id: string, newName: string, newIntake?: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name: newName, intake: newIntake?.trim() || 'Default Intake' } : s));
  };

  const handleDeleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const handleAddIntake = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setCustomIntakes(prev => {
      if (prev.some(it => it.toLowerCase() === cleanName.toLowerCase())) return prev;
      return [...prev, cleanName];
    });
  };

  const handleRenameIntake = (oldName: string, newName: string) => {
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (!cleanOld || !cleanNew || cleanOld === cleanNew) return;

    if (cleanOld === 'Default Intake') return;

    setCustomIntakes(prev => prev.map(it => it === cleanOld ? cleanNew : it));
    setStudents(prev => prev.map(student => {
      const studentIntake = student.intake || 'Default Intake';
      if (studentIntake === cleanOld) {
        return { ...student, intake: cleanNew };
      }
      return student;
    }));
  };

  const handleDeleteIntake = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    if (cleanName === 'Default Intake') return;

    setCustomIntakes(prev => prev.filter(it => it !== cleanName));
    setStudents(prev => prev.map(student => {
      const studentIntake = student.intake || 'Default Intake';
      if (studentIntake === cleanName) {
        return { ...student, intake: 'Default Intake' };
      }
      return student;
    }));
  };

  // 4. Attendance Actions
  const handleUpdateAttendance = (date: string, studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => {
      const dateRecords = prev[date] || {};
      return {
        ...prev,
        [date]: {
          ...dateRecords,
          [studentId]: status
        }
      };
    });

    // Automatically ensure this date is marked for the active section
    setMarkedDates(prev => {
      const existing = prev[activeSectionId] || [];
      if (!existing.includes(date)) {
        return {
          ...prev,
          [activeSectionId]: [...existing, date],
        };
      }
      return prev;
    });
  };

  const handleBulkUpdateAttendance = (date: string, studentIds: string[], status: AttendanceStatus) => {
    setAttendance(prev => {
      const dateRecords = { ...(prev[date] || {}) };
      studentIds.forEach(id => {
        dateRecords[id] = status;
      });
      return {
        ...prev,
        [date]: dateRecords
      };
    });

    // Ensure date is added to tracking calendar registry if not present
    setMarkedDates(prev => {
      const existing = prev[activeSectionId] || [];
      if (!existing.includes(date)) {
        return {
          ...prev,
          [activeSectionId]: [...existing, date],
        };
      }
      return prev;
    });
  };

  const handleClearAttendance = (date: string, studentIds: string[]) => {
    setAttendance(prev => {
      const dateRecords = { ...(prev[date] || {}) };
      studentIds.forEach(id => {
        delete dateRecords[id];
      });
      
      const copy = { ...prev };
      if (Object.keys(dateRecords).length === 0) {
        delete copy[date];
      } else {
        copy[date] = dateRecords;
      }
      return copy;
    });

    // Remove from active section's markedDates catalog
    setMarkedDates(prev => {
      const existing = prev[activeSectionId] || [];
      return {
        ...prev,
        [activeSectionId]: existing.filter(d => d !== date)
      };
    });
  };

  const handleUpdateNote = (date: string, studentId: string, note: string) => {
    setAttendanceNotes(prev => {
      const dateRecords = prev[date] || {};
      const newDateRecords = { ...dateRecords };
      if (!note.trim()) {
        delete newDateRecords[studentId];
      } else {
        newDateRecords[studentId] = note;
      }
      return {
        ...prev,
        [date]: newDateRecords
      };
    });
  };

  const handleSubmitDate = (date: string, sectionId: string) => {
    setSubmittedDates(prev => {
      const existing = prev[sectionId] || [];
      if (!existing.includes(date)) {
        return {
          ...prev,
          [sectionId]: [...existing, date]
        };
      }
      return prev;
    });
  };

  const handleUnsubmitDate = (date: string, sectionId: string) => {
    setSubmittedDates(prev => {
      const existing = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: existing.filter(d => d !== date)
      };
    });
  };

  const handleToggleHoliday = (date: string, sectionId: string) => {
    setHolidays(prev => {
      const existing = prev[sectionId] || [];
      const updated = existing.includes(date)
        ? existing.filter(d => d !== date)
        : [...existing, date];
      return {
        ...prev,
        [sectionId]: updated
      };
    });
  };

  const handleImportGlobalHolidays = (dates: string[]) => {
    setHolidays(prev => {
      const next = { ...prev };
      sections.forEach(sec => {
        const existing = next[sec.id] || [];
        const union = Array.from(new Set([...existing, ...dates]));
        next[sec.id] = union;
      });
      return next;
    });
  };

  // Global metrics across entire app
  const totalGlobalStudents = students.length;
  const activeSectionStudents = students.filter(s => s.sectionId === activeSectionId);

  if (!currentUser) {
    return (
      <Auth
        onLoginSuccess={handleLoginSuccess}
        users={users}
        setUsers={setUsers}
      />
    );
  }

  return (
    <div id="application-container" className="min-h-screen text-slate-800 flex flex-col antialiased">
      
      {/* 1. TOP HEADER & METRIC SUMMARY */}
      <header className="bg-white border-b border-slate-100 shadow-2xs py-4 px-6 md:px-10 shrink-0 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
                RNC Programs
              </h1>
              <p className="text-xs text-slate-500 font-medium capitalize">
                attendance
              </p>
            </div>
          </div>

          {/* Quick global states & User Info dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  Audited: <strong className="text-slate-800">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                </span>
              </div>
              <div className="w-px h-6 bg-slate-100"></div>
              <div>
                Total Registered: <strong className="text-slate-800">{totalGlobalStudents} Students</strong>
              </div>
            </div>

            <div className="w-px h-6 bg-slate-100 hidden sm:block"></div>

            {/* Profile Avatar Badge with Secure Logout Trigger */}
            <div className="flex items-center gap-3 bg-indigo-50/45 hover:bg-indigo-50 border border-indigo-100/50 pl-2 pr-3.5 py-1.5 rounded-2xl transition duration-150">
              <div className="w-7 h-7 rounded-lg bg-indigo-650 text-white font-black flex items-center justify-center text-xs shadow-xs capitalize">
                {currentUser.fullName ? currentUser.fullName.charAt(0) : currentUser.email.charAt(0)}
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-extrabold text-indigo-950 font-display leading-tight truncate max-w-[120px]">
                  {currentUser.fullName || 'Academic Officer'}
                </span>
                <span className="block text-[8px] text-slate-400 font-semibold leading-tight select-all">
                  {currentUser.email}
                </span>
              </div>
              <div className="w-px h-4 bg-indigo-100/70 ml-1"></div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 hover:bg-slate-150 hover:bg-slate-100 hover:text-indigo-600 text-slate-400 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                title="Log out of Secure Session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(true)}
                className="p-1 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                title="Delete Account & All Saved Data"
              >
                <UserX className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT: Section Navigation Sidebar */}
        <aside className="md:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            
            {/* Header with control triggers */}
            <div className="space-y-2 pb-2 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest font-display">Academic Programs</h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowAddProgramModal(true)}
                    className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 text-[9px] font-extrabold flex items-center gap-0.5 cursor-pointer transition-colors"
                    title="Add Program"
                  >
                    <FolderPlus className="w-3 h-3" /> +Prog
                  </button>
                  <button
                    onClick={() => {
                      if (programs.length > 0) {
                        setSelectedProgramIdForNewSection(programs[0].id);
                      }
                      setShowAddSectionModal(true);
                    }}
                    className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-700 text-[9px] font-extrabold flex items-center gap-0.5 cursor-pointer transition-colors"
                    title="Add Course Class"
                  >
                    <Plus className="w-3 h-3" /> +Class
                  </button>
                </div>
              </div>
            </div>

            {/* List of Programs / Folders */}
            <div className="space-y-3.5">
              {programs.length === 0 ? (
                <div className="py-6 px-3 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 leading-normal mb-2">No Programs Created Yet</p>
                  <p className="text-[10px] text-slate-400 mb-3.5">Please add your first Academic Program folder and class section to start tracking students.</p>
                  <button
                    onClick={() => setShowAddProgramModal(true)}
                    className="px-3 py-1.5 bg-indigo-650 text-white rounded-lg text-[10px] font-black hover:bg-indigo-700 cursor-pointer active:scale-95 transition mx-auto block"
                  >
                    + Add Academic Program
                  </button>
                </div>
              ) : (
                programs.map(prog => {
                  const isExpanded = expandedPrograms[prog.id] !== false;
                  const isEditingProg = editingProgramId === prog.id;
                  const progSections = sections.filter(s => s.programId === prog.id);
                  const totalStudentsInProg = students.filter(std => progSections.some(s => s.id === std.sectionId)).length;

                  return (
                    <div key={prog.id} className="space-y-1">
                      {/* Program Header Folder Button */}
                      <div className="group/prog flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 transition-colors">
                        {isEditingProg ? (
                          <div className="flex items-center gap-1 w-full p-1 bg-white border border-slate-200 rounded-lg">
                            <input
                              type="text"
                              value={editingProgramName}
                              onChange={e => setEditingProgramName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEditProgram(prog.id);
                                if (e.key === 'Escape') setEditingProgramId(null);
                              }}
                              className="w-full px-1.5 py-0.5 text-slate-800 text-xxs font-semibold focus:outline-none bg-slate-50/50 rounded"
                              autoFocus
                            />
                            <button onClick={() => handleSaveEditProgram(prog.id)} className="p-0.5 text-emerald-600 shrink-0 cursor-pointer border-none bg-transparent">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditingProgramId(null)} className="p-0.5 text-rose-500 shrink-0 cursor-pointer border-none bg-transparent">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedPrograms(prev => ({
                                  ...prev,
                                  [prog.id]: !isExpanded
                                }));
                              }}
                              className="flex-1 flex items-center gap-1.5 text-left text-xs font-bold text-slate-800 hover:text-indigo-600 cursor-pointer py-1 truncate"
                            >
                              {isExpanded ? (
                                <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                              ) : (
                                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                              )}
                              <span className="truncate">{prog.name}</span>
                            </button>

                            <div className="flex items-center gap-1 opacity-0 group-hover/prog:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProgramId(prog.id);
                                  setEditingProgramName(prog.name);
                                }}
                                className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title="Rename Program"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingProgram(prog)}
                                className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete Program"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Student indicator badge in parent program */}
                            <div className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 font-extrabold text-[9px] scale-90 shrink-0 select-none">
                              {totalStudentsInProg}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Program's Courses/Sections */}
                      {isExpanded && (
                        <div className="pl-3 border-l border-slate-100 ml-2.5 space-y-0.5">
                          {progSections.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic py-1 pl-2.5 select-none font-display">No course sections</p>
                          ) : (
                            progSections.map(sec => {
                              const isActive = sec.id === activeSectionId;
                              const isEditingSec = editingSectionId === sec.id;
                              const count = students.filter(s => s.sectionId === sec.id).length;

                              return (
                                <div
                                  key={sec.id}
                                  className={`group/sec w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                                    isActive
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                  }`}
                                >
                                  {isEditingSec ? (
                                    <div className="flex items-center gap-1 w-full">
                                      <input
                                        type="text"
                                        value={editingSectionName}
                                        onChange={e => setEditingSectionName(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleSaveEditSection(sec.id);
                                          if (e.key === 'Escape') handleCancelEditSection();
                                        }}
                                        className="w-full px-1.5 py-0.5 text-slate-800 bg-white border border-indigo-300 rounded text-xxs focus:outline-none"
                                        autoFocus
                                      />
                                      <button type="button" onClick={() => handleSaveEditSection(sec.id)} className="p-0.5 text-emerald-600 cursor-pointer">
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button type="button" onClick={handleCancelEditSection} className="p-0.5 text-rose-500 cursor-pointer">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveSectionId(sec.id);
                                          setEditingSectionId(null);
                                        }}
                                        className="flex-1 text-left truncate cursor-pointer font-medium py-0.5"
                                      >
                                        {sec.name}
                                      </button>

                                      <div className="flex items-center gap-1 opacity-0 group-hover/sec:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditSection(sec)}
                                          className={`p-0.5 rounded transition ${
                                            isActive ? 'text-indigo-200 hover:text-white' : 'text-slate-400 hover:text-indigo-600'
                                          }`}
                                          title="Rename Section"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRequestDeleteSection(sec)}
                                          className={`p-0.5 rounded transition ${
                                            isActive ? 'text-indigo-200 hover:text-white hover:bg-indigo-700/50' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                          }`}
                                          title="Delete Section"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>

                                      {/* Student Count display badge */}
                                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                        isActive ? 'bg-indigo-750 text-indigo-100' : 'bg-slate-100 text-slate-500'
                                      }`}>
                                        {count}
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section info teaser */}
          {activeSection && (
            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/40 text-[11px] text-indigo-800 space-y-1.5">
              <div className="flex items-center gap-1 text-indigo-900 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Active Roster Audit</span>
              </div>
              <p className="leading-relaxed font-semibold">
                You are currently viewing <strong className="text-indigo-950 font-black">"{activeSection.name}"</strong> section logs. Open tabs to modify active members or look at long-term percentage trackers.
              </p>
            </div>
          )}
        </aside>

        {/* RIGHT: Main App Tabs & Active Panes */}
        <section className="md:col-span-9 flex flex-col gap-6">
          
          {/* MULTIPLE CHOICE ACTIVE GROUP LEVEL SELECTOR */}
          <div id="active-group-multiple-choice-selector" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-display flex items-center gap-1.5">
                      <span>Roster Group Level Selector</span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 animate-bounce" style={{ animationDuration: '3s' }} />
                    </h3>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-150/30 text-indigo-700 text-[9px] font-black tracking-normal uppercase select-none">
                      <Filter className="w-2.5 h-2.5 text-indigo-650" />
                      <span>Filter Active</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">Select a multiple choice level to instantly view and mark student records</p>
                </div>
              </div>
              <span className="text-[10px] bg-indigo-50/70 border border-indigo-100/30 text-indigo-700 rounded-lg px-2.5 py-1 font-extrabold self-start sm:self-auto select-none">
                {activeSectionStudents.length} Registered Students
              </span>
            </div>

            {/* Grid of Choices */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {sections.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-2 col-span-full text-center">No class sections registered. Click "+Class" above to add one.</p>
              ) : (
                sections.map(group => {
                  const isSelected = activeSectionId === group.id;
                  const count = students.filter(s => s.sectionId === group.id).length;
                  
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        setActiveSectionId(group.id);
                        if (group.programId) {
                          setExpandedPrograms(prev => ({ ...prev, [group.programId]: true }));
                        }
                      }}
                      className={`relative p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                          : 'bg-slate-50/60 hover:bg-slate-100/85 border-slate-100 text-slate-500 hover:text-slate-805'
                      }`}
                    >
                      <span className="text-[10px] font-bold font-display truncate max-w-full">
                        {group.name}
                      </span>
                      <span className={`text-[9px] font-black mt-1 px-1.5 py-0.5 rounded-full ${
                        isSelected 
                          ? 'bg-indigo-750 text-indigo-100' 
                          : 'bg-slate-100 text-slate-405'
                      }`}>
                        {count} stds
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Tabs header controller */}
          {activeSection && (
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-4 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  id="tab-attendance-btn"
                  onClick={() => setActiveTab('attendance')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    activeTab === 'attendance'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>Mark Attendance</span>
                </button>
                <button
                  id="tab-weekly-grid-btn"
                  onClick={() => setActiveTab('weekly_grid')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    activeTab === 'weekly_grid'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>Weekly Board</span>
                </button>
                <button
                  id="tab-monthly-board-btn"
                  onClick={() => setActiveTab('monthly_board')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    activeTab === 'monthly_board'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Monthly Board</span>
                </button>
                <button
                  id="tab-intake-board-btn"
                  onClick={() => setActiveTab('intake_board')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    activeTab === 'intake_board'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Intake Board</span>
                </button>
                <button
                  id="tab-students-btn"
                  onClick={() => setActiveTab('students')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    activeTab === 'students'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Manage Students</span>
                </button>
                <button
                  id="tab-student-calendar-btn"
                  onClick={() => setActiveTab('student_calendar')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    activeTab === 'student_calendar'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Student Calendar</span>
                </button>
                <button
                  id="tab-calculator-btn"
                  onClick={() => setActiveTab('calculator')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                    activeTab === 'calculator'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Audit Metrics</span>
                </button>
              </div>

              {/* Status Indicator */}
              <div className="text-xs text-slate-400 font-medium">
                Active group: <strong className="text-indigo-600">{activeSection.name}</strong>
              </div>
            </div>
          )}

          {/* Active Pane displays */}
          {activeSection ? (
            <div className="transition-all duration-350">
              {activeTab === 'attendance' && (
                <CalendarAttendance
                  activeSection={activeSection}
                  students={students}
                  attendance={attendance}
                  attendanceNotes={attendanceNotes}
                  markedDates={markedDates}
                  submittedDates={submittedDates}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onUpdateAttendance={handleUpdateAttendance}
                  onBulkUpdateAttendance={handleBulkUpdateAttendance}
                  onClearAttendance={handleClearAttendance}
                  onUpdateNote={handleUpdateNote}
                  onSubmitDate={handleSubmitDate}
                  onUnsubmitDate={handleUnsubmitDate}
                  holidays={holidays}
                  onToggleHoliday={handleToggleHoliday}
                  onImportGlobalHolidays={handleImportGlobalHolidays}
                />
              )}

               {activeTab === 'weekly_grid' && (
                <WeeklyGrid
                  activeSection={activeSection}
                  students={students}
                  attendance={attendance}
                  onUpdateAttendance={handleUpdateAttendance}
                  onBulkUpdateAttendance={handleBulkUpdateAttendance}
                  onClearAttendance={handleClearAttendance}
                  submittedDates={submittedDates}
                  holidays={holidays}
                  onToggleHoliday={handleToggleHoliday}
                />
              )}

              {activeTab === 'monthly_board' && (
                <MonthlyBoard
                  activeSection={activeSection}
                  students={students}
                  attendance={attendance}
                  submittedDates={submittedDates}
                  sections={sections}
                  holidays={holidays}
                />
              )}

              {activeTab === 'intake_board' && (
                <IntakeBoard
                  students={students}
                  attendance={attendance}
                  submittedDates={submittedDates}
                  sections={sections}
                  holidays={holidays}
                  customIntakes={customIntakes}
                  onAddIntake={handleAddIntake}
                  onRenameIntake={handleRenameIntake}
                  onDeleteIntake={handleDeleteIntake}
                />
              )}

              {activeTab === 'students' && (
                <StudentManager
                  activeSection={activeSection}
                  students={students}
                  attendance={attendance}
                  selectedDate={selectedDate}
                  onAddStudent={handleAddStudent}
                  onEditStudent={handleEditStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onAddStudentsBatch={handleAddStudentsBatch}
                  customIntakes={customIntakes}
                  onAddIntake={handleAddIntake}
                  onRenameIntake={handleRenameIntake}
                  onDeleteIntake={handleDeleteIntake}
                />
              )}

              {activeTab === 'student_calendar' && (
                <StudentCalendarView
                  activeSection={activeSection}
                  students={students}
                  attendance={attendance}
                  attendanceNotes={attendanceNotes}
                  holidays={holidays}
                  onToggleHoliday={handleToggleHoliday}
                />
              )}

              {activeTab === 'calculator' && (
                <AttendanceCalculator
                  activeSection={activeSection}
                  students={students}
                  attendance={attendance}
                  submittedDates={submittedDates}
                  sections={sections}
                  selectedDate={selectedDate}
                  onSubmitDate={handleSubmitDate}
                  holidays={holidays}
                  onSelectSectionId={setActiveSectionId}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-xs">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-700">No Section Selected</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Please configure or select a section from the left sidebar to start tracking students.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* 3. FOOTER */}
      <footer className="mt-auto bg-slate-50 border-t border-slate-100 py-6 text-center text-xxs font-medium text-slate-400">
        <p>© 2026 RollCheck Attendance System. Standard state storage active. Optimized with Outfit Display font.</p>
      </footer>

      {/* 4. MODALS & DIALOGS */}
      
      {/* ADD SECTION MODAL */}
      <AnimatePresence>
        {showAddSectionModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 font-display">Create New Section</h3>
                <button
                  onClick={() => setShowAddSectionModal(false)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddSection} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="modal-section-name" className="text-xxs font-bold text-slate-400 uppercase tracking-wider">
                    Section Name
                  </label>
                  <input
                    id="modal-section-name"
                    type="text"
                    placeholder="e.g. Master Class, Advanced Vibe"
                    value={newSectionName}
                    onChange={e => setNewSectionName(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-section-program" className="text-xxs font-bold text-slate-400 uppercase tracking-wider">
                    Parent Academic Program
                  </label>
                  <select
                    id="modal-section-program"
                    value={selectedProgramIdForNewSection}
                    onChange={e => setSelectedProgramIdForNewSection(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-indigo-500 text-slate-800"
                  >
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSectionModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newSectionName.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer transition shadow-sm shadow-indigo-100"
                  >
                    Save Section
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE SECTION DIALOG WITH REASSIGN OR PURGE SELECTION */}
      <AnimatePresence>
        {deletingSection && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden"
            >
              {/* Alert Header */}
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 font-display">Delete Section: {deletingSection.name}</h3>
                  <p className="text-[10px] text-amber-700 font-semibold">Decide how to handle students currently enrolled in this group</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  There are currently <strong className="text-slate-800">{students.filter(s => s.sectionId === deletingSection.id).length} students</strong> mapped to <strong className="text-slate-800">"{deletingSection.name}"</strong>. How should those students be handled when removing the section?
                </p>

                {/* Options Selection block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: REASSIGN (Only if other sections exist) */}
                  {sections.filter(s => s.id !== deletingSection.id).length > 0 ? (
                    <div className="border border-slate-100 p-4 rounded-xl flex flex-col justify-between space-y-3 bg-slate-50/40">
                      <div>
                        <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-1">
                          <ArrowRightLeft className="w-4 h-4" />
                          <span>Reassign Students</span>
                        </div>
                        <p className="text-xxs text-slate-400 font-medium leading-normal">
                          Safely move the group's student records into another section before completing deletion.
                        </p>
                      </div>
                      
                      {/* Pick section fallback dropdown */}
                      <div className="space-y-1">
                        <label htmlFor="merge-section-picker" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Target Section
                        </label>
                        <select
                          id="merge-section-picker"
                          value={sectionToMergeId}
                          onChange={e => setSectionToMergeId(e.target.value)}
                          className="w-full text-xxs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold focus:outline-none focus:border-indigo-500"
                        >
                          {sections
                            .filter(s => s.id !== deletingSection.id)
                            .map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmDeleteSection(false)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xxs font-bold cursor-pointer transition"
                      >
                        Merge & Delete
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-100 p-4 rounded-xl opacity-50 bg-slate-50 flex items-center justify-center text-center">
                      <p className="text-xxs text-slate-400 font-medium leading-normal">
                        No secondary sections exist to merge students into.
                      </p>
                    </div>
                  )}

                  {/* Option B: PURGE STUFF */}
                  <div className="border border-red-50 p-4 rounded-xl flex flex-col justify-between space-y-4 bg-red-50/20">
                    <div>
                      <div className="flex items-center gap-2 text-rose-600 text-xs font-bold mb-1">
                        <Trash2 className="w-4 h-4" />
                        <span>Purge All records</span>
                      </div>
                      <p className="text-xxs text-slate-400 font-medium leading-normal">
                        Completely remove the section AND erase its students and historical list matches. This action is irreversible.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfirmDeleteSection(true)}
                      className="w-full py-2 bg-rose-650 hover:bg-rose-700 text-white rounded-lg text-xxs font-bold cursor-pointer transition"
                    >
                      Delete Section & Purge
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setDeletingSection(null)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD PROGRAM MODAL */}
      <AnimatePresence>
        {showAddProgramModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 font-display">Create Academic Program</h3>
                <button
                  type="button"
                  onClick={() => setShowAddProgramModal(false)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddProgram} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="modal-program-name" className="text-xxs font-bold text-slate-400 uppercase tracking-wider">
                    Program Folder Name
                  </label>
                  <input
                    id="modal-program-name"
                    type="text"
                    placeholder="e.g. English Bridge Program, Vibe Academy"
                    value={newProgramName}
                    onChange={e => setNewProgramName(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-800 font-medium"
                  />
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProgramModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newProgramName.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer transition shadow-sm shadow-emerald-100"
                  >
                    Save Program
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE PROGRAM DIALOG WITH REASSIGN OR PURGE SELECTION */}
      <AnimatePresence>
        {deletingProgram && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden"
            >
              {/* Alert Header */}
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-805 text-amber-800 rounded-lg animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 font-display">Delete Program: {deletingProgram.name}</h3>
                  <p className="text-[10px] text-amber-700 font-semibold">Decide how to handle course sections mapped to this folder</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  There are currently <strong className="text-slate-800">{sections.filter(s => s.programId === deletingProgram.id).length} classes</strong> mapped to <strong className="text-slate-800">"{deletingProgram.name}"</strong>. How should those classes and their enrolled students be handled?
                </p>

                {/* Options Selection block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: REASSIGN (Only if other programs exist) */}
                  {programs.filter(p => p.id !== deletingProgram.id).length > 0 ? (
                    <div className="border border-slate-100 p-4 rounded-xl flex flex-col justify-between space-y-3 bg-slate-50/40">
                      <div>
                        <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-1">
                          <ArrowRightLeft className="w-4 h-4" />
                          <span>Reassign Classes</span>
                        </div>
                        <p className="text-xxs text-slate-400 font-medium leading-normal">
                          Safely move all this program's classes into another academic program before completing deletion.
                        </p>
                      </div>
                      
                      {/* Pick program fallback dropdown */}
                      <div className="space-y-1">
                        <label htmlFor="merge-program-picker" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Target Program
                        </label>
                        <select
                          id="merge-program-picker"
                          value={programToMergeId}
                          onChange={e => setProgramToMergeId(e.target.value)}
                          className="w-full text-xxs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold focus:outline-none focus:border-indigo-500"
                        >
                          {programs
                            .filter(p => p.id !== deletingProgram.id)
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmDeleteProgram(false)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xxs font-bold cursor-pointer transition-colors"
                      >
                        Reassign & Delete
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-100 p-4 rounded-xl opacity-50 bg-slate-50 flex items-center justify-center text-center">
                      <p className="text-xxs text-slate-400 font-medium leading-normal">
                        No other academic programs exist to reassign courses to.
                      </p>
                    </div>
                  )}

                  {/* Option B: PURGE ALL RECORD */}
                  <div className="border border-red-50 p-4 rounded-xl flex flex-col justify-between space-y-4 bg-red-50/20">
                    <div>
                      <div className="flex items-center gap-2 text-rose-600 text-xs font-bold mb-1">
                        <Trash2 className="w-4 h-4" />
                        <span>Purge Program & Classes</span>
                      </div>
                      <p className="text-xxs text-slate-400 font-medium leading-normal">
                        Completely wipe the program, ALL its courses, and ALL historical student enrollments. Irreversible.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfirmDeleteProgram(true)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xxs font-bold cursor-pointer transition-colors"
                    >
                      Delete All & Purge
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setDeletingProgram(null)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteAccountModal && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-5 bg-red-50 border-b border-red-100 flex items-center gap-3">
                <div className="p-2 bg-red-150 bg-red-100 text-red-700 rounded-xl">
                  <UserX className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-950 font-display">Delete Account Permanently?</h3>
                  <p className="text-[10px] text-red-700 font-semibold">This action cannot be undone</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  You are about to permanently delete your account (<strong className="text-slate-805 text-slate-800">{currentUser.email}</strong>) and all associated local databases.
                </p>

                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>All academic programs and section folders are wiped</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>All student registrations and classes are completely removed</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>All attendance checklists and historical records are wiped</span>
                  </div>
                </div>

                <p className="text-xxs text-amber-600 font-bold leading-normal bg-amber-50/50 p-3 rounded-lg border border-amber-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Once deleted, your local credentials list is freed. You can instantly register again using this exact same email to start fresh!</span>
                </p>
              </div>

              <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Keep My Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteAccount();
                    setShowDeleteAccountModal(false);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl cursor-pointer transition-all shadow-sm shadow-rose-100"
                >
                  Delete Account & Wipe Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
