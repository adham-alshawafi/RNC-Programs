import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Calendar as CalendarIcon, 
  UserCheck, 
  AlertCircle, 
  MessageSquare, 
  FileText, 
  Coffee, 
  Upload, 
  FileSpreadsheet, 
  Info, 
  Sparkles, 
  Users, 
  Award, 
  TrendingUp, 
  Activity,
  CalendarX
} from 'lucide-react';
import { Student, AttendanceMap, AttendanceStatus, Section, AttendanceNotesMap } from '../types';

interface CalendarAttendanceProps {
  activeSection: Section;
  students: Student[];
  attendance: AttendanceMap;
  attendanceNotes: AttendanceNotesMap;
  markedDates: Record<string, string[]>; // sectionId -> dates
  submittedDates: Record<string, string[]>; // sectionId -> dates
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onUpdateAttendance: (date: string, studentId: string, status: AttendanceStatus) => void;
  onBulkUpdateAttendance: (date: string, studentIds: string[], status: AttendanceStatus) => void;
  onClearAttendance: (date: string, studentIds: string[]) => void;
  onUpdateNote: (date: string, studentId: string, note: string) => void;
  onSubmitDate: (date: string, sectionId: string) => void;
  onUnsubmitDate: (date: string, sectionId: string) => void;
  holidays: Record<string, string[]>;
  onToggleHoliday: (date: string, sectionId: string) => void;
  onImportGlobalHolidays: (dates: string[]) => void;
  canceledClasses: Record<string, Record<string, string>>;
  onToggleCanceledClass: (date: string, sectionId: string, note?: string) => void;
  onUpdateCanceledNote: (date: string, sectionId: string, note: string) => void;
}

export default function CalendarAttendance({
  activeSection,
  students,
  attendance,
  attendanceNotes,
  markedDates,
  submittedDates,
  selectedDate,
  onSelectDate,
  onUpdateAttendance,
  onBulkUpdateAttendance,
  onClearAttendance,
  onUpdateNote,
  onSubmitDate,
  onUnsubmitDate,
  holidays,
  onToggleHoliday,
  onImportGlobalHolidays,
  canceledClasses,
  onToggleCanceledClass,
  onUpdateCanceledNote,
}: CalendarAttendanceProps) {
  // Calendar internal tracking (viewing month/year)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // 0-indexed (June 2026 matches system timeframe)

  // View modes: 'roster' (standard date check) or 'student' (individual student calendar overview)
  const [viewMode, setViewMode] = useState<'roster' | 'student'>('roster');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [focusedStudentId, setFocusedStudentId] = useState<string>('');

  // Dynamic monthly metadata for student level persistence
  const [studentLevels, setStudentLevels] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('attendance_student_levels');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleLevelChange = (studentId: string, level: string) => {
    const updated = { ...studentLevels, [studentId]: level };
    setStudentLevels(updated);
    localStorage.setItem('attendance_student_levels', JSON.stringify(updated));
  };

  // Note editing state variables
  const [editingNoteStudentId, setEditingNoteStudentId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Canceled class inline state
  const [cancelReasonText, setCancelReasonText] = useState('');

  // Sync cancelReasonText when selectedDate changes or canceledClasses changes
  useEffect(() => {
    const sectionCanceled = canceledClasses[activeSection.id] || {};
    setCancelReasonText(sectionCanceled[selectedDate] || '');
  }, [selectedDate, activeSection.id, canceledClasses]);

  // Bulk Holiday CSV Import States
  const [dragActive, setDragActive] = useState(false);
  const [csvDates, setCsvDates] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Sync current month/year hook from selected date is appropriate on mounting
  useEffect(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-');
      setCurrentYear(Number(y));
      setCurrentMonth(Number(m) - 1);
    }
  }, []);

  // Filter students for active section
  const sectionStudents = useMemo(() => {
    return students.filter(std => std.sectionId === activeSection.id);
  }, [students, activeSection.id]);

  // Handle selected student safety mapping
  useEffect(() => {
    if (sectionStudents.length > 0) {
      const exists = sectionStudents.some(s => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(sectionStudents[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [sectionStudents, selectedStudentId]);

  // Safeguard: Ensure focusedStudentId matches active list for daily roster shortcuts
  useEffect(() => {
    if (sectionStudents.length > 0) {
      const exists = sectionStudents.some(s => s.id === focusedStudentId);
      if (!exists) {
        setFocusedStudentId(sectionStudents[0].id);
      }
    } else {
      setFocusedStudentId('');
    }
  }, [sectionStudents, focusedStudentId]);

  // Keyboard Shortcuts Listener for rapid Roster roll call marking 
  useEffect(() => {
    if (viewMode !== 'roster' || sectionStudents.length === 0) return;

    const handleRosterShortcuts = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === 'INPUT' || 
        activeEl?.tagName === 'TEXTAREA' || 
        activeEl?.tagName === 'SELECT' ||
        activeEl?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      const pad = (num: number) => String(num).padStart(2, '0');

      // Date navigation shortcuts
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const parts = selectedDate.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          d.setDate(d.getDate() - 1);
          const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          onSelectDate(formatted);
          setCurrentMonth(d.getMonth());
          setCurrentYear(d.getFullYear());
        }
        return;
      } 
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const parts = selectedDate.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          d.setDate(d.getDate() + 1);
          const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          onSelectDate(formatted);
          setCurrentMonth(d.getMonth());
          setCurrentYear(d.getFullYear());
        }
        return;
      }

      const currentIndex = sectionStudents.findIndex(s => s.id === focusedStudentId);
      if (currentIndex === -1 && sectionStudents.length > 0) {
        setFocusedStudentId(sectionStudents[0].id);
        return;
      }

      const key = e.key.toLowerCase();
      const isDayHoliday = (holidays[activeSection.id] || []).includes(selectedDate);
      const isDayCanceled = canceledClasses[activeSection.id]?.[selectedDate] !== undefined;
      const isInactiveDay = isDayHoliday || isDayCanceled;

      // Index reference boundary management
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % sectionStudents.length;
        setFocusedStudentId(sectionStudents[nextIndex].id);
        const rowEl = document.getElementById(`student-row-${sectionStudents[nextIndex].id}`);
        rowEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } 
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + sectionStudents.length) % sectionStudents.length;
        setFocusedStudentId(sectionStudents[prevIndex].id);
        const rowEl = document.getElementById(`student-row-${sectionStudents[prevIndex].id}`);
        rowEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } 
      else if (key === 'p') {
        e.preventDefault();
        if (isInactiveDay) return;
        const currentStudent = sectionStudents[currentIndex];
        if (currentStudent && !currentStudent.isWithdrawn) {
          onUpdateAttendance(selectedDate, currentStudent.id, 'present');
          const nextIndex = (currentIndex + 1) % sectionStudents.length;
          setFocusedStudentId(sectionStudents[nextIndex].id);
          const rowEl = document.getElementById(`student-row-${sectionStudents[nextIndex].id}`);
          rowEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
      else if (key === 'a') {
        e.preventDefault();
        if (isInactiveDay) return;
        const currentStudent = sectionStudents[currentIndex];
        if (currentStudent && !currentStudent.isWithdrawn) {
          onUpdateAttendance(selectedDate, currentStudent.id, 'absent');
          const nextIndex = (currentIndex + 1) % sectionStudents.length;
          setFocusedStudentId(sectionStudents[nextIndex].id);
          const rowEl = document.getElementById(`student-row-${sectionStudents[nextIndex].id}`);
          rowEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
      else if (key === 'w') {
        e.preventDefault();
        if (isInactiveDay) return;
        const currentStudent = sectionStudents[currentIndex];
        if (currentStudent && !currentStudent.isWithdrawn) {
          onUpdateAttendance(selectedDate, currentStudent.id, 'withdrawn');
          const nextIndex = (currentIndex + 1) % sectionStudents.length;
          setFocusedStudentId(sectionStudents[nextIndex].id);
          const rowEl = document.getElementById(`student-row-${sectionStudents[nextIndex].id}`);
          rowEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Escape') {
        e.preventDefault();
        if (isInactiveDay) return;
        const currentStudent = sectionStudents[currentIndex];
        if (currentStudent) {
          onClearAttendance(selectedDate, [currentStudent.id]);
        }
      }
      else if (key === 'n') {
        e.preventDefault();
        if (isInactiveDay) return;
        const currentStudent = sectionStudents[currentIndex];
        if (currentStudent) {
          const notesForDate = attendanceNotes[selectedDate] || {};
          const studentNote = notesForDate[currentStudent.id] || '';
          setEditingNoteStudentId(currentStudent.id);
          setNoteText(studentNote);
        }
      }
    };

    window.addEventListener('keydown', handleRosterShortcuts);
    return () => window.removeEventListener('keydown', handleRosterShortcuts);
  }, [viewMode, sectionStudents, focusedStudentId, selectedDate, onUpdateAttendance, onClearAttendance, attendanceNotes, holidays, canceledClasses, activeSection.id]);

  // Clear editing states if group or day transitions
  useEffect(() => {
    setEditingNoteStudentId(null);
    setNoteText('');
  }, [activeSection.id, selectedDate]);

  const sectionMarkedDates = markedDates[activeSection.id] || [];
  const sectionSubmittedDates = submittedDates[activeSection.id] || [];
  const sectionHolidays = holidays[activeSection.id] || [];
  const isHolidayActiveDate = sectionHolidays.includes(selectedDate);
  const isCanceledActiveDate = canceledClasses[activeSection.id]?.[selectedDate] !== undefined;

  // Month names helper
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Create calendar dates array
  const calendarCells = useMemo(() => {
    const cells: { dateString: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const paddingDay = prevMonthDays - i;
      cells.push({
        dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(paddingDay).padStart(2, '0')}`,
        dayNum: paddingDay,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding (to complete 6 rows / 42 cells)
    const remainingCells = 42 - cells.length;
    for (let n = 1; n <= remainingCells; n++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      cells.push({
        dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`,
        dayNum: n,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentYear, currentMonth, firstDayIndex, daysInMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(prev => prev - 1);
      } else {
        setCurrentMonth(prev => prev - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(prev => prev + 1);
      } else {
        setCurrentMonth(prev => prev + 1);
      }
    }
  };

  // Check if attendance is complete (everyone has entry) or partial or untouched for the active date
  const selectedDateAttendance = attendance[selectedDate] || {};
  const presentCount = sectionStudents.filter(s => selectedDateAttendance[s.id] === 'present').length;
  const absentCount = sectionStudents.filter(s => selectedDateAttendance[s.id] === 'absent').length;
  const hasAttendanceRecorded = sectionMarkedDates.includes(selectedDate);

  // Quick helper to format dates beautifully
  const formatFriendlyDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Student month performance metrics
  const selectedStudentPerformance = useMemo(() => {
    if (!selectedStudentId || viewMode !== 'student') {
      return { presents: 0, absents: 0, holidays: 0, canceledCount: 0, schoolDaysCount: 0, rate: null };
    }

    // Filter cell list to focus specifically on the active month's current month dates
    const currentMonthCells = calendarCells.filter(cell => cell.isCurrentMonth);
    const sectionCanceled = canceledClasses[activeSection.id] || {};
    let presents = 0;
    let absents = 0;
    let holidaysCount = 0;
    let canceledCount = 0;

    currentMonthCells.forEach(cell => {
      if (sectionHolidays.includes(cell.dateString)) {
        holidaysCount++;
        return;
      }
      if (sectionCanceled[cell.dateString] !== undefined) {
        canceledCount++;
        return;
      }
      const st = attendance[cell.dateString]?.[selectedStudentId];
      if (st === 'present') {
        presents++;
      } else if (st === 'absent') {
        absents++;
      }
    });

    const schoolDaysCount = Math.max(0, currentMonthCells.length - holidaysCount - canceledCount);
    const activeCheckedCount = presents + absents;
    const rate = activeCheckedCount > 0 ? Math.round((presents / activeCheckedCount) * 100) : null;

    return {
      presents,
      absents,
      holidays: holidaysCount,
      canceledCount,
      schoolDaysCount,
      rate
    };
  }, [selectedStudentId, viewMode, calendarCells, attendance, sectionHolidays, canceledClasses, activeSection.id]);

  // Find targeted student name helper
  const activeStudentName = useMemo(() => {
    const found = sectionStudents.find(s => s.id === selectedStudentId);
    return found ? found.name : 'Unknown Student';
  }, [sectionStudents, selectedStudentId]);

  // CSV Drag and Drop utilities for Bulk Holidays
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processHolidayCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processHolidayCsvFile(e.target.files[0]);
    }
  };

  const processHolidayCsvFile = (file: File) => {
    setImportError(null);
    setImportSuccess(null);
    setCsvDates([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error('Could not read file content');
        }

        const lines = text.split(/\r?\n/);
        const datesFound: string[] = [];

        for (const line of lines) {
          if (!line.trim()) continue;
          // split by typical CSV delimiters
          const tokens = line.split(/[,;\t]/);
          for (const token of tokens) {
            const cleanToken = token.replace(/["']/g, '').trim();
            if (!cleanToken) continue;

            // 1. Matches YYYY-MM-DD
            const ymdMatch = cleanToken.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
            if (ymdMatch) {
              const y = parseInt(ymdMatch[1], 10);
              const m = parseInt(ymdMatch[2], 10) - 1;
              const d = parseInt(ymdMatch[3], 10);
              const dObj = new Date(y, m, d);
              if (!isNaN(dObj.getTime())) {
                datesFound.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
                continue;
              }
            }

            // 2. Typical native Parseable dates
            const checkSecs = Date.parse(cleanToken);
            if (!isNaN(checkSecs)) {
              const dObj = new Date(checkSecs);
              const y = dObj.getFullYear();
              const m = dObj.getMonth();
              const d = dObj.getDate();
              // Prevent random year tags
              if (y > 2000 && y < 2100) {
                datesFound.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
              }
            }
          }
        }

        const uniqueSorted = Array.from(new Set(datesFound)).sort();
        if (uniqueSorted.length === 0) {
          throw new Error('No valid calendar dates could be parsed. Make sure dates are in YYYY-MM-DD format (e.g. 2026-06-25).');
        }

        setCsvDates(uniqueSorted);
      } catch (err: any) {
        setImportError(err.message || 'Error processing holiday csv');
      }
    };

    reader.onerror = () => {
      setImportError('Could not open the file safely.');
    };
    reader.readAsText(file);
  };

  const handleRegisterHolidays = () => {
    if (csvDates.length === 0) return;
    onImportGlobalHolidays(csvDates);
    setImportSuccess(`Successfully imported ${csvDates.length} yearly school holiday dates across all levels!`);
    setCsvDates([]);
  };

  const handleCancelCsvImport = () => {
    setCsvDates([]);
    setImportSuccess(null);
    setImportError(null);
  };

  return (
    <div id="calendar-attendance-root" className="space-y-6">
      
      {/* Top Segmented Tabs: Roster Roll Call vs Student Calendar */}
      <div className="flex bg-slate-105 p-1 rounded-xl gap-1 max-w-sm sm:max-w-md select-none border border-slate-200/50">
        <button
          type="button"
          onClick={() => setViewMode('roster')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer ${
            viewMode === 'roster'
              ? 'bg-white text-indigo-700 shadow-3xs outline-none'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Roster Roll Call</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('student')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer ${
            viewMode === 'student'
              ? 'bg-white text-indigo-700 shadow-3xs outline-none'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>Student View & Holidays</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Monthly Calendar Grid Component */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 font-display flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-indigo-500" />
                  <span>
                    {viewMode === 'student' ? 'Individual Monthly View' : 'Select Calendar Date'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 font-medium leading-none">
                  {viewMode === 'student' 
                    ? 'Colored by focused student records' 
                    : 'Click a day to view or mark attendance'}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-white hover:shadow-xs text-slate-600 rounded-lg transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 min-w-[100px] text-center font-display select-none">
                  {MONTHS[currentMonth]} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-white hover:shadow-xs text-slate-600 rounded-lg transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday indicators */}
            <div className="grid grid-cols-7 text-center mb-2 select-none">
              {DAYS_OF_WEEK.map(day => (
                <span key={day} className="text-xxs font-bold text-slate-400 uppercase tracking-wider py-1">
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar grid cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.dateString === selectedDate;
                const isHoliday = sectionHolidays.includes(cell.dateString);
                
                // Check if selected date cell is today
                const todayStr = new Date().toISOString().split('T')[0];
                const isToday = cell.dateString === todayStr;

                const sectionCanceled = canceledClasses[activeSection.id] || {};
                const isCanceled = sectionCanceled[cell.dateString] !== undefined;
                const cancelNote = sectionCanceled[cell.dateString];

                if (viewMode === 'student') {
                  // Individual student performance display mapping
                  const studentStatus = selectedStudentId ? (attendance[cell.dateString]?.[selectedStudentId] || '') : '';
                  const hasMarked = studentStatus !== '';

                  let blockColorClass = 'text-slate-700 bg-white hover:bg-slate-50 border border-transparent';
                  if (isSelected) {
                    blockColorClass = 'bg-indigo-600 text-white shadow-sm ring-1 ring-offset-2 ring-indigo-500';
                  } else if (!cell.isCurrentMonth) {
                    blockColorClass = 'text-slate-300 hover:bg-slate-50/50';
                  } else if (isCanceled) {
                    blockColorClass = 'bg-rose-50 border border-dashed border-rose-300 text-rose-700 hover:bg-rose-100/55';
                  } else if (isHoliday) {
                    blockColorClass = 'bg-amber-50/50 border border-amber-200/50 text-amber-700 hover:bg-amber-100/55';
                  } else if (studentStatus === 'present') {
                    blockColorClass = 'bg-emerald-50 border border-emerald-200/60 text-emerald-800 hover:bg-emerald-100/55';
                  } else if (studentStatus === 'absent') {
                    blockColorClass = 'bg-rose-50 border border-rose-200/60 text-rose-800 hover:bg-rose-100/55 font-bold';
                  } else if (isToday) {
                    blockColorClass = 'bg-amber-50/30 border border-amber-205 text-amber-800 hover:bg-amber-100/40';
                  }

                  const studentNote = selectedStudentId ? (attendanceNotes[cell.dateString]?.[selectedStudentId] || '') : '';
                  const hasNote = studentNote && studentNote.trim() !== '';

                  return (
                    <button
                      key={`student-cell-${cell.dateString}-${idx}`}
                      onClick={() => onSelectDate(cell.dateString)}
                      className={`group relative p-2 rounded-lg text-xs font-semibold aspect-square flex flex-col items-center justify-center cursor-pointer transition-all ${blockColorClass}`}
                    >
                      <span className="text-[11px] font-bold z-10 leading-none">{cell.dayNum}</span>
                      
                      {/* Interactive dynamic sub indicators */}
                      {isCanceled ? (
                        <CalendarX className={`w-2.5 h-2.5 mt-1 shrink-0 ${isSelected ? 'text-indigo-200' : 'text-rose-500 animate-pulse'}`} />
                      ) : isHoliday ? (
                        <Coffee className={`w-2.5 h-2.5 mt-1 shrink-0 ${isSelected ? 'text-indigo-200' : 'text-amber-500'}`} />
                      ) : studentStatus === 'present' ? (
                        <span className={`px-1 py-0.1 outline-none text-[8px] font-black tracking-wide leading-none rounded-sm mt-0.5 ${
                          isSelected ? 'bg-indigo-700 text-white' : 'bg-emerald-500/15 text-emerald-700'
                        }`}>P</span>
                      ) : studentStatus === 'absent' ? (
                        <span className={`px-1 py-0.1 outline-none text-[8px] font-black tracking-wide leading-none rounded-sm mt-0.5 animate-pulse ${
                          isSelected ? 'bg-indigo-700 text-white' : 'bg-rose-500/15 text-rose-700'
                        }`}>A</span>
                      ) : (
                        <span className="text-[7px] font-bold text-slate-300 mt-1">-</span>
                      )}

                      {/* Hover Note Tooltip */}
                      {hasNote && (
                        <>
                          <div className={`absolute top-0.5 left-0.5 p-0.5 rounded-full z-20 ${
                            isSelected ? 'text-indigo-200' : 'text-indigo-500 animate-pulse'
                          }`}>
                            <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                          </div>
                          
                          {/* Note Tooltip */}
                          <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 absolute bottom-[108%] left-1/2 -translate-x-1/2 w-48 p-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl pointer-events-none z-55 text-left font-medium leading-normal">
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">
                              <MessageSquare className="w-3 h-3 text-indigo-400" />
                              <span>Roll Note</span>
                            </div>
                            <p className="text-[10px] text-slate-200 line-clamp-3 leading-snug break-words font-medium normal-case">
                              {studentNote}
                            </p>
                          </div>
                        </>
                      )}

                      {/* Canceled Class Tooltip and indicator */}
                      {isCanceled && (
                        <>
                          {/* Cancel Note Tooltip */}
                          <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 absolute bottom-[108%] left-1/2 -translate-x-1/2 w-48 p-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl pointer-events-none z-55 text-left font-medium leading-normal">
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1">
                              <CalendarX className="w-3 h-3 text-rose-400" />
                              <span>Class Canceled</span>
                            </div>
                            <p className="text-[10px] text-slate-250 break-words font-medium normal-case italic">
                              "{cancelNote || 'No reason specified'}"
                            </p>
                          </div>
                        </>
                      )}
                    </button>
                  );
                } else {
                  // Standard Mark Attendance roster list indicators
                  const hasMarked = sectionMarkedDates.includes(cell.dateString);
                  let blockColorClass = 'text-slate-700 hover:bg-slate-50';
                  
                  if (isSelected) {
                    blockColorClass = 'bg-indigo-600 text-white shadow-sm shadow-indigo-150';
                  } else if (!cell.isCurrentMonth) {
                    blockColorClass = 'text-slate-300 hover:bg-slate-50';
                  } else if (isToday) {
                    blockColorClass = 'bg-amber-50/50 border border-amber-200 text-amber-800 hover:bg-amber-100 hover:text-amber-900';
                  } else if (isCanceled) {
                    blockColorClass = 'bg-rose-50 border border-dashed border-rose-300 text-rose-800 hover:bg-rose-100/55';
                  } else if (isHoliday) {
                    blockColorClass = 'bg-amber-50/30 border border-amber-200/50 text-amber-700 hover:bg-amber-100/55';
                  }

                  // Check if any student in the active section has a note on this date
                  const sectionNotes = attendanceNotes[cell.dateString] || {};
                  const studentsWithNotes = Object.entries(sectionNotes)
                    .filter(([stId, noteText]) => {
                      return noteText && noteText.trim() !== '' && sectionStudents.some(s => s.id === stId);
                    })
                    .map(([stId, noteText]) => {
                      const name = sectionStudents.find(s => s.id === stId)?.name || 'Student';
                      return { name, note: noteText };
                    });
                  const hasSectionNotes = studentsWithNotes.length > 0;

                  return (
                    <button
                      key={`roster-cell-${cell.dateString}-${idx}`}
                      onClick={() => {
                        onSelectDate(cell.dateString);
                        const [y, m] = cell.dateString.split('-');
                        setCurrentYear(Number(y));
                        setCurrentMonth(Number(m) - 1);
                      }}
                      className={`group relative p-2.5 rounded-lg text-xs font-semibold transition-all aspect-square flex flex-col items-center justify-center cursor-pointer ${blockColorClass}`}
                    >
                      <span className="z-10">{cell.dayNum}</span>
                      
                      {isCanceled ? (
                        <CalendarX className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 ${
                          isSelected ? 'text-indigo-200' : 'text-rose-500 animate-pulse'
                        }`} />
                      ) : isHoliday ? (
                        <Coffee className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 ${
                          isSelected ? 'text-indigo-200' : 'text-amber-500 animate-pulse'
                        }`} />
                      ) : null}

                      {/* Submitted status dot */}
                      {hasMarked && (
                        <span className={`absolute bottom-1 w-1.2 h-1.2 rounded-full ${
                          sectionSubmittedDates.includes(cell.dateString)
                            ? (isSelected ? 'bg-emerald-300' : 'bg-emerald-500')
                            : (isSelected ? 'bg-amber-300' : 'bg-amber-500')
                        }`} />
                      )}

                      {/* Hover note tooltip for Roster View Mode */}
                      {hasSectionNotes && !isCanceled && (
                        <>
                          <div className={`absolute top-0.5 left-0.5 p-0.5 rounded-full z-20 ${
                            isSelected ? 'text-indigo-200' : 'text-indigo-500 animate-pulse'
                          }`}>
                            <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                          </div>
                          
                          {/* Section Notes Tooltip */}
                          <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 absolute bottom-[108%] left-1/2 -translate-x-1/2 w-56 p-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl pointer-events-none z-55 text-left font-medium leading-normal">
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1.5 border-b border-slate-800 pb-1">
                              <MessageSquare className="w-3 h-3 text-indigo-400" />
                              <span>Cohort Notes ({studentsWithNotes.length})</span>
                            </div>
                            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                              {studentsWithNotes.map((item, si) => (
                                <div key={si} className="text-[10px] leading-tight break-words font-medium normal-case">
                                  <span className="font-extrabold text-indigo-200 block truncate">{item.name}:</span>
                                  <span className="text-slate-300 block italic">"{item.note}"</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Hover Canceled block tooltip when in roster mode */}
                      {isCanceled && (
                        <>
                          {/* Canceled Tooltip */}
                          <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 absolute bottom-[108%] left-1/2 -translate-x-1/2 w-56 p-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl pointer-events-none z-55 text-left font-medium leading-normal">
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1.5 border-b border-rose-950 pb-1">
                              <CalendarX className="w-3 h-3 text-rose-450" />
                              <span>Class Canceled</span>
                            </div>
                            <p className="text-[10px] text-slate-200 leading-normal normal-case break-words italic">
                              "{cancelNote || 'No reason specified'}"
                            </p>
                          </div>
                        </>
                      )}
                    </button>
                  );
                }
              })}
            </div>
          </div>

          {/* Legend and Informational Blocks */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-col gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider select-none">
            {viewMode === 'student' ? (
              <div className="space-y-1.5 leading-normal">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500/15 border border-emerald-300 flex items-center justify-center text-[7px] text-emerald-700 font-black">P</span>
                    <span>Student Present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-500/15 border border-rose-350 flex items-center justify-center text-[7px] text-rose-700 font-black">A</span>
                    <span>Student Absent</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-dotted border-slate-100 leading-normal text-[8px] text-slate-450 uppercase font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-amber-50/45 border border-amber-200/50 flex items-center justify-center">
                      <Coffee className="w-2.5 h-2.5 text-amber-500" />
                    </span>
                    <span>School Holiday</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1 px-1 py-0.5 bg-slate-100 border border-slate-205 text-slate-400 font-mono text-[6px] rounded leading-none">-</span>
                    <span>No record log</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Draft (Uncalculated)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Submitted & Calculated</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1.5 pt-0.5 border-t border-dotted border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-amber-50 border border-amber-200 block shrink-0"></span>
                    <span>Today's Date</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-amber-50/45 border border-amber-200/50 flex items-center justify-center shrink-0">
                      <Coffee className="w-2.5 h-2.5 text-amber-500" />
                    </span>
                    <span>School Holiday</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL DESIGNS */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          
          {viewMode === 'student' ? (
            // INDIVIDUAL STUDENT PROFILE WORKSPACE
            <div className="space-y-6">
              
              {/* Student Dropdown Selector Header */}
              <div className="bg-slate-50/80 border border-slate-150 p-4 rounded-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-3xs">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-3">Focused Student</label>
                    <span className="text-xs text-slate-600 font-bold block">Viewing dynamic monthly metrics</span>
                    {selectedStudentId && studentLevels[selectedStudentId] && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-black uppercase tracking-wider animate-pulse shadow-2xs">
                        {studentLevels[selectedStudentId]} Level
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                  {/* Class Level Dropdown */}
                  <div className="flex flex-col gap-0.5 w-full sm:w-44">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-3">Class Level</span>
                    <select
                      value={selectedStudentId ? (studentLevels[selectedStudentId] || 'Beginner') : 'Beginner'}
                      disabled={!selectedStudentId}
                      onChange={e => selectedStudentId && handleLevelChange(selectedStudentId, e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 cursor-pointer shadow-3xs hover:border-slate-350 transition disabled:opacity-50"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Pre-starter">Pre-starter</option>
                      <option value="Starter">Starter</option>
                      <option value="Elementary">Elementary</option>
                      <option value="Pre-Intermediate">Pre-Intermediate</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Upper-Intermediate">Upper-Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  {/* Student Select Dropdown */}
                  <div className="flex flex-col gap-0.5 w-full sm:w-56">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-3">Select Student</span>
                    <select
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-205 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 cursor-pointer shadow-3xs hover:border-slate-350 transition"
                    >
                      <option value="" disabled>-- Select a Student --</option>
                      {sectionStudents.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name} {student.intake ? `(${student.intake})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {selectedStudentId ? (
                <div className="space-y-5">
                  
                  {/* Dynamic Month statistical Bento grid */}
                  <div className="space-y-2 select-none">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Student Attendance in {MONTHS[currentMonth]} {currentYear}
                    </h5>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      
                      {/* Attendance Percentage progress block */}
                      <div className="p-3 bg-linear-to-tr from-indigo-50/50 to-indigo-10/20 border border-indigo-100/50 rounded-xl text-center space-y-1">
                        <span className="text-[9px] font-extrabold text-indigo-500 uppercase block tracking-wider leading-none">Rate</span>
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-lg font-black font-mono text-indigo-950">
                            {selectedStudentPerformance.rate !== null ? `${selectedStudentPerformance.rate}%` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Presents counter */}
                      <div className="p-3 bg-emerald-50/40 border border-emerald-100/50 rounded-xl text-center space-y-1">
                        <span className="text-[9px] font-extrabold text-emerald-600 uppercase block tracking-wider leading-none">Presents</span>
                        <div className="flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px]" />
                          <span className="text-lg font-black font-mono text-emerald-900">
                            {selectedStudentPerformance.presents}
                          </span>
                        </div>
                      </div>

                      {/* Absents counter */}
                      <div className="p-3 bg-rose-50/40 border border-rose-100/50 rounded-xl text-center space-y-1">
                        <span className="text-[9px] font-extrabold text-rose-500 uppercase block tracking-wider leading-none">Absents</span>
                        <div className="flex items-center justify-center gap-1">
                          <X className="w-3.5 h-3.5 text-rose-500 stroke-[2px]" />
                          <span className="text-lg font-black font-mono text-rose-900 animate-fade-in">
                            {selectedStudentPerformance.absents}
                          </span>
                        </div>
                      </div>

                      {/* Holidays counter */}
                      <div className="p-3 bg-amber-50/40 border border-amber-150/40 rounded-xl text-center space-y-1">
                        <span className="text-[9px] font-extrabold text-amber-600 uppercase block tracking-wider leading-none">Holidays</span>
                        <div className="flex items-center justify-center gap-1">
                          <Coffee className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-lg font-black font-mono text-amber-900">
                            {selectedStudentPerformance.holidays}
                          </span>
                        </div>
                      </div>

                      {/* Canceled class counter */}
                      <div className="p-3 bg-rose-50/40 border border-rose-150/40 rounded-xl text-center space-y-1 animate-fade-in">
                        <span className="text-[9px] font-extrabold text-rose-600 uppercase block tracking-wider leading-none">Canceled</span>
                        <div className="flex items-center justify-center gap-1">
                          <CalendarX className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-lg font-black font-mono text-rose-900">
                            {selectedStudentPerformance.canceledCount || 0}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Date planner custom control card */}
                  <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/10 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Date Action Dashboard</span>
                        <h4 className="text-sm font-bold text-slate-800">{formatFriendlyDate(selectedDate)}</h4>
                      </div>
                      
                      {/* Interactive toggle status display badge */}
                      <div className="shrink-0 flex gap-1.5">
                        {isCanceledActiveDate ? (
                          <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 select-none animate-fade-in">
                            <CalendarX className="w-2.5 h-2.5 text-rose-500 animate-pulse" />
                            <span>Class Canceled</span>
                          </span>
                        ) : isHolidayActiveDate ? (
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 select-none animate-fade-in">
                            <Coffee className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                            <span>Holiday</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-205 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 select-none">
                            <span>Open School Day</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick check/unmark attendance actions for selected student on selectedDate */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      
                      {/* Attendance actions section */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">
                          Mark Attendance: {isCanceledActiveDate && <span className="text-rose-500 font-extrabold normal-case">(Canceled)</span>}
                        </span>
                        <div className={`flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 ${isCanceledActiveDate ? 'opacity-40 pointer-events-none' : ''}`}>
                          <button
                            type="button"
                            disabled={isCanceledActiveDate}
                            onClick={() => onUpdateAttendance(selectedDate, selectedStudentId, 'present')}
                            className={`flex-1 py-1 px-2 rounded-md text-xxs font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              attendance[selectedDate]?.[selectedStudentId] === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>
                          <button
                            type="button"
                            disabled={isCanceledActiveDate}
                            onClick={() => onUpdateAttendance(selectedDate, selectedStudentId, 'absent')}
                            className={`flex-1 py-1 px-2 rounded-md text-xxs font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              attendance[selectedDate]?.[selectedStudentId] === 'absent'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                          <button
                            type="button"
                            disabled={isCanceledActiveDate}
                            onClick={() => onUpdateAttendance(selectedDate, selectedStudentId, 'withdrawn')}
                            className={`flex-1 py-1 px-2 rounded-md text-xxs font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              attendance[selectedDate]?.[selectedStudentId] === 'withdrawn'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Withdrawn</span>
                          </button>
                        </div>
                      </div>

                      {/* Holiday & Cancellation toggling actions */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">School Session Calendar:</span>
                        <div className="flex flex-col gap-1.5">
                          {/* Holiday Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isCanceledActiveDate) {
                                onToggleCanceledClass(selectedDate, activeSection.id);
                              }
                              onToggleHoliday(selectedDate, activeSection.id);
                            }}
                            className={`w-full py-1.5 px-3 rounded-lg text-xxs font-black tracking-wide uppercase border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isHolidayActiveDate
                                ? 'bg-amber-500 border-amber-400 text-white hover:bg-amber-600 shadow-3xs'
                                : 'bg-white hover:bg-slate-50 border-slate-205 text-amber-700 hover:text-amber-850'
                            }`}
                          >
                            <Coffee className="w-3.5 h-3.5" />
                            <span>{isHolidayActiveDate ? 'Remove Holiday' : 'Mark as Holiday'}</span>
                          </button>

                          {/* Class Canceled Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isHolidayActiveDate) {
                                onToggleHoliday(selectedDate, activeSection.id);
                              }
                              onToggleCanceledClass(selectedDate, activeSection.id, cancelReasonText || "Class was canceled");
                            }}
                            className={`w-full py-1.5 px-3 rounded-lg text-xxs font-black tracking-wide uppercase border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isCanceledActiveDate
                                ? 'bg-rose-500 border-rose-450 text-white hover:bg-rose-600 shadow-3xs'
                                : 'bg-white hover:bg-slate-50 border-slate-205 text-rose-700 hover:text-rose-850'
                            }`}
                          >
                            <CalendarX className="w-3.5 h-3.5" />
                            <span>{isCanceledActiveDate ? 'Remove Cancellation' : 'Mark Class Canceled'}</span>
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Integrated custom class cancellation note editor */}
                    {isCanceledActiveDate && (
                      <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 animate-fade-in text-rose-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-wide flex items-center gap-1.5">
                            <CalendarX className="w-3.5 h-3.5 text-rose-550 animate-pulse" />
                            <span>Class Cancellation Note & Reason:</span>
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={cancelReasonText}
                            onChange={e => {
                              setCancelReasonText(e.target.value);
                              onUpdateCanceledNote(selectedDate, activeSection.id, e.target.value);
                            }}
                            placeholder="e.g. Weather Emergency, Teacher out sick, National Holiday event"
                            className="flex-1 px-3 py-1.5 text-xs bg-rose-50/10 border border-rose-200 rounded-lg text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-100 font-semibold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Integrated dynamic student attendance note editing pad */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">
                          Attendance Note for <strong className="text-indigo-600">"{activeStudentName}"</strong>
                        </span>
                        {attendanceNotes[selectedDate]?.[selectedStudentId] && (
                          <button
                            type="button"
                            onClick={() => onUpdateNote(selectedDate, selectedStudentId, '')}
                            className="text-[9px] font-extrabold text-rose-500 hover:text-rose-700 transition"
                          >
                            Delete note
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingNoteStudentId === selectedStudentId ? noteText : (attendanceNotes[selectedDate]?.[selectedStudentId] || '')}
                          onChange={e => {
                            setEditingNoteStudentId(selectedStudentId);
                            setNoteText(e.target.value);
                          }}
                          placeholder="e.g. Leave, Sick, Travel documentation"
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 font-medium"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              onUpdateNote(selectedDate, selectedStudentId, noteText);
                              setEditingNoteStudentId(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = editingNoteStudentId === selectedStudentId ? noteText : (attendanceNotes[selectedDate]?.[selectedStudentId] || '');
                            onUpdateNote(selectedDate, selectedStudentId, val);
                            setEditingNoteStudentId(null);
                          }}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xxs font-black cursor-pointer transition"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 border border-slate-100 rounded-2xl bg-slate-50/10 text-center select-none">
                  <p className="text-xs text-slate-400">Please choose a student from the active cohort to populate profiles.</p>
                </div>
              )}

              {/* HOLIDAYS IMPORT DRAWER / PANEL */}
              <div className="p-4 bg-linear-to-b from-indigo-50/15 via-indigo-50/5 to-transparent border border-indigo-100/60 rounded-xl space-y-3.5 select-none animate-fade-in shadow-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-600" />
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Import Yearly Holidays</h5>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase">Register school holidays globally</p>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Upload a standard CSV of school holidays. Date strings formatting will automatically map to all class sections.
                </p>
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-150 ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/30' 
                      : 'border-slate-200 hover:border-indigo-300 bg-white/70 hover:bg-slate-50'
                  }`}
                  onClick={() => document.getElementById('holiday-csv-upload-input')?.click()}
                >
                  <input
                    id="holiday-csv-upload-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                  <div className="text-xxs font-extrabold text-slate-600 mb-0.5">
                    Drag and drop holiday CSV or <span className="text-indigo-600 hover:underline">browse</span>
                  </div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Accepts standard column of dates
                  </div>
                </div>

                {/* Error & Success Messages */}
                {importError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 text-xxs font-semibold rounded-lg flex items-center gap-1.5 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xxs font-semibold rounded-lg space-y-1 animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px] shrink-0" />
                      <span className="font-extrabold">{importSuccess}</span>
                    </div>
                    {csvDates.length > 0 && (
                      <div className="text-[9px] text-slate-500/80 max-h-[80px] overflow-y-auto leading-normal uppercase">
                        Parsed: {csvDates.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* If CSV is loaded but not yet registered */}
                {csvDates.length > 0 && !importSuccess && (
                  <div className="flex items-center gap-2 pt-1 animate-fade-in">
                    <button
                      type="button"
                      onClick={handleRegisterHolidays}
                      className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xxs font-black transition cursor-pointer select-none"
                    >
                      Confirm Register {csvDates.length} Holidays
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelCsvImport}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-205 text-slate-550 rounded-lg text-xxs font-bold transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
                
                <div className="pt-2 border-t border-slate-100/60 flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                  <span>Example Schema:</span>
                  <span className="font-mono text-slate-600 bg-slate-105 px-1.5 py-0.5 rounded">Holiday, Date</span>
                </div>
              </div>

            </div>
          ) : (
            // ROSTER ENTRY COLUMN (STANDARD)
            <div>
              {/* Header line */}
              <div className="border-b border-slate-100 pb-5 mb-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl transition-colors ${
                    isHolidayActiveDate
                      ? 'bg-amber-50 text-amber-600 border border-amber-200/50'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {isHolidayActiveDate ? (
                      <Coffee className="w-5 h-5 animate-pulse" />
                    ) : (
                      <CalendarIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                      <span>{formatFriendlyDate(selectedDate)}</span>
                      {isHolidayActiveDate && (
                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-fade-in select-none">
                          <Coffee className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                          <span>Holiday</span>
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Roll check for <span className="font-semibold text-slate-700">{activeSection.name}</span>
                    </p>
                  </div>
                </div>

                {/* Quick stats for selected day */}
                {hasAttendanceRecorded && (
                  <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{presentCount} Present</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200"></div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>{absentCount} Absent</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk actions */}
              {sectionStudents.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/40">
                  <span className="text-xs font-semibold text-slate-600">Bulk Actions:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onBulkUpdateAttendance(selectedDate, sectionStudents.map(s => s.id), 'present')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xxs font-bold cursor-pointer transition-colors"
                    >
                      All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => onBulkUpdateAttendance(selectedDate, sectionStudents.map(s => s.id), 'absent')}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xxs font-bold cursor-pointer transition-colors"
                    >
                      All Absent
                    </button>
                    {hasAttendanceRecorded && (
                      <button
                        type="button"
                        onClick={() => onClearAttendance(selectedDate, sectionStudents.map(s => s.id))}
                        className="px-2.5 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-600 rounded-lg text-xxs font-bold cursor-pointer transition"
                      >
                        Clear Records
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Holiday Alert Banner */}
              {isHolidayActiveDate && (
                <div className="mb-4 p-3.5 bg-amber-50/70 border border-amber-200/50 rounded-xl flex items-start gap-2.5 text-amber-800 animate-fade-in select-none">
                  <Coffee className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                  <div className="text-xxs leading-relaxed">
                    <strong className="text-amber-950 font-black block mb-0.5 uppercase tracking-wider flex items-center gap-1">School Holiday Active</strong>
                    This date is marked as a school holiday for <span className="font-extrabold">{activeSection.name}</span>. Attendance details entered here will be recorded, but calculations will automatically skip this date when compiling main metrics.
                  </div>
                </div>
              )}

              {/* Roster Sheet */}
              <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-1 select-none flex-wrap gap-2">
                <span>Roster Sheet</span>
                <div id="roster-shortcuts-help" className="flex items-center gap-2 text-slate-400 font-semibold normal-case">
                  <span className="flex items-center gap-0.5"><kbd className="bg-slate-100 border border-slate-200 text-[9px] px-1 rounded shadow-3xs font-mono font-bold text-slate-600">↑↓</kbd> Nav</span>
                  <span className="flex items-center gap-0.5"><kbd className="bg-slate-100 border border-slate-200 text-[9px] px-1 rounded shadow-3xs font-mono font-bold text-slate-600">P</kbd> Present</span>
                  <span className="flex items-center gap-0.5"><kbd className="bg-slate-100 border border-slate-200 text-[9px] px-1 rounded shadow-3xs font-mono font-bold text-slate-600">A</kbd> Absent</span>
                  <span className="flex items-center gap-0.5"><kbd className="bg-slate-100 border border-slate-200 text-[9px] px-1 rounded shadow-3xs font-mono font-bold text-slate-600">W</kbd> Withdraw</span>
                  <span className="flex items-center gap-0.5"><kbd className="bg-slate-100 border border-slate-200 text-[9px] px-1 rounded shadow-3xs font-mono font-bold text-slate-600">N</kbd> Note</span>
                </div>
              </div>
              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto bg-slate-50/20">
                {sectionStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center select-none">
                    <p className="text-xs text-slate-400 leading-normal">Please add students to this section to mark attendance.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {sectionStudents.map((student) => {
                      const currentStatus = selectedDateAttendance[student.id];
                      const dateNotes = attendanceNotes[selectedDate] || {};
                      const studentNote = dateNotes[student.id] || '';
                      const isEditingNote = editingNoteStudentId === student.id;
                      const isFocused = student.id === focusedStudentId;

                      return (
                        <div 
                          key={student.id} 
                          id={`student-row-${student.id}`}
                          onClick={() => setFocusedStudentId(student.id)}
                          className={`border-b last:border-b-0 border-slate-100/60 transition-all cursor-pointer relative select-none ${
                            isFocused 
                              ? 'bg-indigo-50/25 border-l-2 border-l-indigo-500/80 shadow-3xs' 
                              : 'bg-white border-l-2 border-l-transparent'
                          }`}
                        >
                          
                          {/* Main Student Row */}
                          <div className={`px-4 py-3 flex items-center justify-between gap-4 transition-all ${isFocused ? 'bg-indigo-50/10' : 'hover:bg-slate-50/30'}`}>
                            {/* Name & Note indicator with tooltip decoration */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`text-xs font-semibold truncate max-w-[240px] sm:max-w-md xl:max-w-xl ${student.isWithdrawn ? 'text-slate-400 line-through decoration-rose-300' : 'text-slate-750'}`}>
                                {student.name}
                              </span>
                              {student.isWithdrawn && (
                                <span className="px-2 py-0.5 bg-rose-50 border border-rose-150 text-rose-700 rounded-md text-[9px] font-black uppercase tracking-wider select-none shrink-0">
                                  Withdrawn
                                </span>
                              )}
                              {studentNote && (
                                <span
                                  title={`Attendance note: ${studentNote}`}
                                  className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[9px] font-bold truncate max-w-[155px] cursor-help flex items-center gap-1 shrink-0 select-none animate-fade-in"
                                >
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{studentNote}</span>
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2.5 shrink-0">
                              {/* Note Addition Toggle Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditingNote) {
                                    setEditingNoteStudentId(null);
                                  } else {
                                    setEditingNoteStudentId(student.id);
                                    setNoteText(studentNote);
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition-all border shrink-0 cursor-pointer ${
                                  studentNote 
                                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-155 border-indigo-200/50' 
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 border-slate-200/50'
                                }`}
                                title={studentNote ? `Edit explanation: ${studentNote}` : "Add attendance note / absence explanation"}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* Attendance Toggle Switches */}
                              <div className="flex items-center gap-1 bg-slate-100/85 p-0.5 rounded-lg border border-slate-200/45">
                                <button
                                  type="button"
                                  onClick={() => onUpdateAttendance(selectedDate, student.id, 'present')}
                                  className={`px-2.5 py-1 rounded-md text-xxs font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-605 text-white bg-emerald-605 shadow-xs bg-emerald-600'
                                      : 'text-slate-505 text-slate-500 hover:text-slate-805 hover:text-slate-800'
                                  }`}
                                >
                                  <Check className="w-3 h-3 shrink-0" />
                                  <span className="hidden sm:inline">Present</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateAttendance(selectedDate, student.id, 'absent')}
                                  className={`px-2.5 py-1 rounded-md text-xxs font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                                    currentStatus === 'absent'
                                      ? 'bg-rose-505 text-white bg-rose-505 shadow-xs bg-rose-500'
                                      : 'text-slate-505 text-slate-500 hover:text-slate-805 hover:text-slate-800'
                                  }`}
                                >
                                  <X className="w-3 h-3 shrink-0" />
                                  <span className="hidden sm:inline">Absent</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateAttendance(selectedDate, student.id, 'withdrawn')}
                                  className={`px-2.5 py-1 rounded-md text-xxs font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                                    currentStatus === 'withdrawn'
                                      ? 'bg-amber-505 text-white bg-amber-505 shadow-xs bg-amber-600'
                                      : 'text-slate-505 text-slate-500 hover:text-slate-805 hover:text-slate-800'
                                  }`}
                                  title="Mark student as Withdrawn on this date"
                                >
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span className="hidden sm:inline">Withdrawn</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Edit Note Tray */}
                          {isEditingNote && (
                            <div className="px-4 py-3.5 bg-slate-50 border-t border-b border-slate-100/80 flex flex-col gap-2.5">
                              <div className="flex items-center justify-between select-none">
                                <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wide">
                                  Attendance note for <strong className="text-slate-700 font-extrabold">"{student.name}"</strong>:
                                </span>
                                {studentNote && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUpdateNote(selectedDate, student.id, '');
                                      setEditingNoteStudentId(null);
                                    }}
                                    className="text-[9px] font-extrabold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                                  >
                                    Delete Current Note
                                  </button>
                                )}
                              </div>
                              
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  placeholder="e.g. Sick Leave, Late due to snow, Off sick"
                                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 font-medium"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      onUpdateNote(selectedDate, student.id, noteText);
                                      setEditingNoteStudentId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingNoteStudentId(null);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateNote(selectedDate, student.id, noteText);
                                    setEditingNoteStudentId(null);
                                  }}
                                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs shadow-indigo-100 shrink-0"
                                >
                                  Save Note
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteStudentId(null)}
                                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
                                >
                                  Cancel
                                </button>
                              </div>

                              {/* Quick pre-select labels */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 select-none">
                                <span className="text-[9px] font-semibold text-slate-400 mr-1 select-none">Quick reasons:</span>
                                {['Sick Leave', 'Excused Absence', 'Late Arrival', 'Medical Appt.', 'Family Leave', 'Zoom Remote'].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setNoteText(preset)}
                                    className={`px-2 py-0.5 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded text-[9px] font-bold text-slate-500 transition-colors cursor-pointer ${
                                      noteText === preset ? 'border-indigo-400 bg-indigo-50/50 text-indigo-700' : ''
                                    }`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit or Finalize Block */}
              {hasAttendanceRecorded && (
                <div className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-305 ${
                  sectionSubmittedDates.includes(selectedDate)
                    ? 'bg-emerald-50/50 border-emerald-100/70 text-emerald-805' 
                    : 'bg-indigo-50/30 border-indigo-100/30 text-slate-705'
                }`}>
                  <div className="space-y-1">
                    <h5 className="text-xs font-extrabold font-display flex items-center gap-1.5">
                      {sectionSubmittedDates.includes(selectedDate) ? (
                        <>
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white font-bold shrink-0 text-[10px]">✓</span>
                          <span className="text-emerald-900">Attendance Submitted & Saved!</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold shrink-0 text-[10px]">!</span>
                          <span className="text-indigo-900">Pending Roster Submission</span>
                        </>
                      )}
                    </h5>
                    <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                      {sectionSubmittedDates.includes(selectedDate)
                        ? `Roll call finalized on ${formatFriendlyDate(selectedDate)}. Class metrics of ${activeSection.name} are calculated.`
                        : 'Changes are currently saved in local draft mode. Submit to apply and calculate performance metrics.'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {sectionSubmittedDates.includes(selectedDate) ? (
                      <button
                        type="button"
                        onClick={() => onUnsubmitDate(selectedDate, activeSection.id)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-xxs font-extrabold cursor-pointer transition-colors"
                      >
                        Revert to Draft
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSubmitDate(selectedDate, activeSection.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xxs font-extrabold cursor-pointer transition-all shadow-sm shadow-emerald-150"
                      >
                        Submit Attendance
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync Prompt Footer */}
          <div className="mt-5 border-t border-slate-50 pt-4 flex items-center justify-between text-xxs font-medium text-slate-400 select-none">
            <div className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-450" />
              <span>
                {hasAttendanceRecorded
                  ? 'Recorded in local memory storage'
                  : 'Not yet recorded (Click filters above or change items to auto-log)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasAttendanceRecorded ? 'bg-emerald-500' : 'bg-slate-350'}`}></span>
              <span className="text-slate-500 font-bold">{hasAttendanceRecorded ? 'COMMITTED' : 'UNMARKED'}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
