import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Search, 
  User, 
  Coffee, 
  Check, 
  X, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  HelpCircle,
  BookOpen,
  CalendarDays,
  FileText,
  CalendarX
} from 'lucide-react';
import { Student, Section, AttendanceMap, AttendanceStatus, AttendanceNotesMap } from '../types';

interface StudentCalendarViewProps {
  activeSection: Section;
  students: Student[];
  attendance: AttendanceMap;
  attendanceNotes: AttendanceNotesMap;
  holidays: Record<string, string[]>;
  onToggleHoliday: (date: string, sectionId: string) => void;
  canceledClasses: Record<string, Record<string, string>>;
  onToggleCanceledClass?: (date: string, sectionId: string, note?: string) => void;
  onUpdateCanceledNote?: (date: string, sectionId: string, note: string) => void;
}

export default function StudentCalendarView({
  activeSection,
  students,
  attendance,
  attendanceNotes,
  holidays,
  onToggleHoliday,
  canceledClasses,
  onToggleCanceledClass,
  onUpdateCanceledNote
}: StudentCalendarViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // States for interactive selected day details modal
  const [selectedCellDate, setSelectedCellDate] = useState<string | null>(null);
  const [localCancelNote, setLocalCancelNote] = useState('');

  // Sync cancellation reason changes
  useEffect(() => {
    if (selectedCellDate) {
      const sectionCanceled = canceledClasses[activeSection.id] || {};
      const note = sectionCanceled[selectedCellDate] || '';
      setLocalCancelNote(note);
    }
  }, [selectedCellDate, activeSection.id, canceledClasses]);
  
  // Local calendar month state initialized to June 2026 (matching system timeframe)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June is index 5

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter students to the active section
  const sectionStudents = useMemo(() => {
    return students.filter(s => s.sectionId === activeSection.id);
  }, [students, activeSection.id]);

  // Handle setting default student or preserving selection
  useEffect(() => {
    if (sectionStudents.length > 0) {
      const stillExists = sectionStudents.some(s => s.id === selectedStudentId);
      if (!stillExists) {
        setSelectedStudentId(sectionStudents[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [sectionStudents, selectedStudentId]);

  // Find currently selected student object
  const selectedStudent = useMemo(() => {
    return sectionStudents.find(s => s.id === selectedStudentId) || null;
  }, [sectionStudents, selectedStudentId]);

  // Calendar Math and Grid calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells: { dateString: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prior Month days padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const paddingDay = prevMonthDays - i;
      cells.push({
        dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(paddingDay).padStart(2, '0')}`,
        dayNum: paddingDay,
        isCurrentMonth: false
      });
    }

    // Current Month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayNum: d,
        isCurrentMonth: true
      });
    }

    // Next Month days padding
    const remainingCells = 42 - cells.length;
    for (let n = 1; n <= remainingCells; n++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      cells.push({
        dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`,
        dayNum: n,
        isCurrentMonth: false
      });
    }

    return cells;
  }, [currentYear, currentMonth, firstDayIndex, daysInMonth]);

  const activeSectionHolidays = useMemo(() => {
    return holidays[activeSection.id] || [];
  }, [holidays, activeSection.id]);

  // Calculate dynamic attendance stats for any student / month combo
  const getStudentStatsForMonth = (studentId: string, monthIdx: number, yearNum: number) => {
    if (!studentId) return { presents: 0, absents: 0, holidaysCount: 0, canceledCount: 0, totalMarkedDays: 0, rate: null };

    // Get cells of ONLY the current month
    const currentMonthDays = calendarCells.filter(cell => cell.isCurrentMonth);
    const sectionCanceled = canceledClasses[activeSection.id] || {};
    let presents = 0;
    let absents = 0;
    let holidaysCount = 0;
    let canceledCount = 0;

    currentMonthDays.forEach(cell => {
      if (activeSectionHolidays.includes(cell.dateString)) {
        holidaysCount++;
      } else if (sectionCanceled[cell.dateString] !== undefined) {
        canceledCount++;
      } else {
        const status = attendance[cell.dateString]?.[studentId];
        if (status === 'present') presents++;
        if (status === 'absent') absents++;
      }
    });

    const totalMarkedDays = presents + absents;
    const rate = totalMarkedDays > 0 ? Math.round((presents / totalMarkedDays) * 100) : null;

    return {
      presents,
      absents,
      holidaysCount,
      canceledCount,
      totalMarkedDays,
      rate
    };
  };

  // Stats for the currently selected student
  const selectedStudentStats = useMemo(() => {
    return getStudentStatsForMonth(selectedStudentId, currentMonth, currentYear);
  }, [selectedStudentId, currentMonth, currentYear, calendarCells, attendance, activeSectionHolidays, canceledClasses, activeSection.id]);

  // Student list search filter
  const filteredStudents = useMemo(() => {
    return sectionStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.intake && s.intake.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sectionStudents, searchTerm]);

  // Navigate calendar month
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

  // Get lists of all precise attendance records for this student during the month
  const monthlyLogs = useMemo(() => {
    if (!selectedStudentId) return { presentsList: [], absentsList: [], withdrawnsList: [] };

    const presentsList: { dateString: string; friendlyDate: string; note?: string }[] = [];
    const absentsList: { dateString: string; friendlyDate: string; note?: string }[] = [];
    const withdrawnsList: { dateString: string; friendlyDate: string; note?: string }[] = [];

    // Filter current month cells sorted by date ascending
    const currentMonthCells = calendarCells
      .filter(cell => cell.isCurrentMonth)
      .sort((a, b) => a.dateString.localeCompare(b.dateString));

    currentMonthCells.forEach(cell => {
      // Skip holidays
      if (activeSectionHolidays.includes(cell.dateString)) return;

      const status = attendance[cell.dateString]?.[selectedStudentId];
      const note = attendanceNotes[cell.dateString]?.[selectedStudentId];

      const [y, m, d] = cell.dateString.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      const friendlyDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });

      if (status === 'present') {
        presentsList.push({ dateString: cell.dateString, friendlyDate, note });
      } else if (status === 'absent') {
        absentsList.push({ dateString: cell.dateString, friendlyDate, note });
      } else if (status === 'withdrawn') {
        withdrawnsList.push({ dateString: cell.dateString, friendlyDate, note });
      }
    });

    return { presentsList, absentsList, withdrawnsList };
  }, [selectedStudentId, calendarCells, attendance, attendanceNotes, activeSectionHolidays]);

  const [activeLogTab, setActiveLogTab] = useState<'absent' | 'present' | 'withdrawn'>('absent');

  return (
    <div id="student-calendar-view-root" className="space-y-6">
      
      {/* Visual Workspace Hero segment */}
      <div className="bg-gradient-to-r from-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient opacity-10 pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 bg-white/10 border border-white/15 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-200">
            Analytics Module
          </span>
          <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-indigo-400 shrink-0" />
            Student Attendance Calendar
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
            Select any student from your active class group to view a full calendar visualization of their daily presence, absence records, school holidays, and monthly performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Student Selector list (12 cols grid map) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl shadow-xs p-5 flex flex-col gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Select Student</h3>
            <p className="text-[11px] text-slate-400 font-medium">Search name or filters in {activeSection.name}</p>
          </div>

          {/* Search student filter field */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="student-calendar-search"
              type="text"
              placeholder="Search student name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Student clickable list */}
          <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20 max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                {sectionStudents.length === 0 ? (
                  "No students enrolled in this group yet."
                ) : (
                  `No student matches "${searchTerm}"`
                )}
              </div>
            ) : (
              filteredStudents.map(student => {
                const isSelected = student.id === selectedStudentId;
                const stats = getStudentStatsForMonth(student.id, currentMonth, currentYear);
                
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left gap-3 select-none transition-all duration-150 cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50/50 border-l-3 border-indigo-600 pl-[13px]' 
                        : 'hover:bg-slate-50/50 border-l-3 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {/* Initials Badge */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 select-none ${
                        isSelected 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {student.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="block text-xs font-bold text-slate-700 truncate leading-snug">
                          {student.name}
                        </span>
                        {student.intake && (
                          <span className="block text-[10px] text-slate-400 font-medium">
                            {student.intake}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rate Dynamic Badge */}
                    <div className="shrink-0 text-right">
                      {stats.rate !== null ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black font-mono select-none ${
                          stats.rate >= 90 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : stats.rate >= 75 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {stats.rate}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono font-medium select-none">—</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Calendar Panel & Details (8 cols grid map) */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedStudent ? (
            <div className="space-y-6">
              
              {/* Statistical Bento Card */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5 space-y-4">
                
                {/* Visual Bio Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-105 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-700 text-lg font-black font-display shadow-2xs select-none">
                      {selectedStudent.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800 leading-tight">
                        {selectedStudent.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-wide">
                          {activeSection.name}
                        </span>
                        {selectedStudent.intake && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-black uppercase tracking-wide">
                            {selectedStudent.intake}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Calendar controller */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 p-1 rounded-xl self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => navigateMonth('prev')}
                      className="p-1 hover:bg-white hover:shadow-xs text-slate-600 rounded-lg transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-slate-700 min-w-[120px] text-center font-display select-none">
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

                {/* Grid stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
                  <div className={`p-3 rounded-2xl text-center space-y-1 border transition-all ${
                    selectedStudentStats.rate !== null
                      ? selectedStudentStats.rate >= 90 
                        ? 'bg-emerald-50/30 border-emerald-100' 
                        : selectedStudentStats.rate >= 75
                        ? 'bg-amber-50/30 border-amber-100'
                        : 'bg-rose-50/30 border-rose-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider leading-none">Attendance Rate</span>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-lg font-black font-mono text-slate-800">
                        {selectedStudentStats.rate !== null ? `${selectedStudentStats.rate}%` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/20 border border-emerald-100/50 rounded-2xl text-center space-y-1">
                    <span className="text-[9px] font-black text-emerald-600 block uppercase tracking-wider leading-none">Days Present</span>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-lg font-black font-mono text-emerald-800">
                        {selectedStudentStats.presents}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50/20 border border-rose-100/50 rounded-2xl text-center space-y-1">
                    <span className="text-[9px] font-black text-rose-600 block uppercase tracking-wider leading-none">Days Absent</span>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <X className="w-4 h-4 text-rose-500" />
                      <span className="text-lg font-black font-mono text-slate-800">
                        {selectedStudentStats.absents}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/20 border border-amber-100/50 rounded-2xl text-center space-y-1">
                    <span className="text-[9px] font-black text-amber-600 block uppercase tracking-wider leading-none">School Holidays</span>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Coffee className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-lg font-black font-mono text-slate-800">
                        {selectedStudentStats.holidaysCount}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Master Calendar Grid panel */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5">
                
                {/* Weekday indicators */}
                <div className="grid grid-cols-7 text-center mb-2 select-none">
                  {DAYS_OF_WEEK.map(day => (
                    <span key={day} className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-1.5">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Grid cells */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarCells.map((cell, idx) => {
                    const isHoliday = activeSectionHolidays.includes(cell.dateString);
                    const status = attendance[cell.dateString]?.[selectedStudentId] || '';
                    const hasMarked = status !== '';

                    const sectionCanceled = canceledClasses[activeSection.id] || {};
                    const cancelNote = sectionCanceled[cell.dateString];
                    const isCanceled = typeof cancelNote === 'string';

                    let blockClass = 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-100';
                    let statusLabel = '';

                    if (isCanceled) {
                      blockClass = 'bg-rose-50/50 border border-dashed border-rose-300 text-rose-800';
                      statusLabel = 'canceled';
                    } else if (isHoliday) {
                      blockClass = 'bg-amber-50/60 border-amber-200/60 text-amber-800';
                      statusLabel = 'holiday';
                    } else if (status === 'present') {
                      blockClass = 'bg-emerald-50/90 border-emerald-200 text-emerald-800';
                      statusLabel = 'present';
                    } else if (status === 'absent') {
                      blockClass = 'bg-rose-50/90 border-rose-200 text-rose-800';
                      statusLabel = 'absent';
                    } else if (status === 'withdrawn') {
                      blockClass = 'bg-amber-50/90 border-amber-200/80 text-amber-800';
                      statusLabel = 'withdrawn';
                    }

                    // Highlight today
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isToday = cell.dateString === todayStr;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (cell.isCurrentMonth) {
                            setSelectedCellDate(cell.dateString);
                          }
                        }}
                        title={
                          cell.isCurrentMonth 
                            ? `${cell.dateString} - ${isCanceled ? `Canceled: "${cancelNote}"` : isHoliday ? 'Holiday' : status ? status : 'No attendance record'}. Click to view details.`
                            : ''
                        }
                        className={`min-h-[60px] sm:min-h-[70px] p-1 rounded-xl flex flex-col justify-between transition-all relative select-none cursor-pointer group border ${blockClass} ${
                          !cell.isCurrentMonth ? 'opacity-30 pointer-events-none bg-slate-50 border-transparent' : 'shadow-3xs hover:-translate-y-0.5'
                        } ${isToday ? 'ring-2 ring-indigo-500/50 ring-offset-1' : ''}`}
                      >
                        {/* Number day trigger */}
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black ${isToday ? 'text-indigo-600 font-extrabold font-mono' : 'text-slate-500'}`}>
                            {cell.dayNum}
                          </span>
                          {/* Inner status marker icon for rich visualizations */}
                          {cell.isCurrentMonth && (
                            <div className="opacity-80 scale-90 sm:scale-100">
                              {isCanceled ? (
                                <CalendarX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                              ) : isHoliday ? (
                                <Coffee className="w-3.5 h-3.5 text-amber-500" />
                              ) : status === 'present' ? (
                                <span className="w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-2xs">P</span>
                              ) : status === 'absent' ? (
                                <span className="w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-2xs">A</span>
                              ) : status === 'withdrawn' ? (
                                <span className="w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-2xs">W</span>
                              ) : (
                                <span className="w-3.5 h-1 bg-slate-200 rounded-full inline-block" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Interactive fast info label when hover */}
                        <div className="hidden sm:block text-[7px] font-black uppercase text-center tracking-widest leading-none mt-1 opacity-0 group-hover:opacity-100 group-hover:text-indigo-600 font-sans">
                          {cell.isCurrentMonth ? 'View Details' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Calendar Legend and help text */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3.5 border-t border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 spin-on-hover">
                      <span className="w-3 h-3 bg-emerald-500 rounded text-center text-white text-[7px] font-bold flex items-center justify-center shadow-3xs">P</span>
                      <span>Present</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-rose-500 rounded text-center text-white text-[7px] font-bold flex items-center justify-center shadow-3xs">A</span>
                      <span>Absent</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-amber-500 rounded text-center text-white text-[7px] font-bold flex items-center justify-center shadow-3xs">W</span>
                      <span>Withdrawn</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                      <span>Canceled</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-amber-500" />
                      <span>Holiday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-1 bg-slate-200 block rounded" />
                      <span>No Record</span>
                    </div>
                  </div>
                  <div className="text-indigo-600/80 font-bold normal-case text-[10px] flex items-center gap-1 shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Click block in the current month map to view details or toggle Holiday/Canceled status.</span>
                  </div>
                </div>

              </div>

              {/* Attendance Log listings Split table: detailed scanning */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5">
                
                {/* Selection toggle line header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Breakdown Lists</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Verify daily notes & entries for {MONTHS[currentMonth]}</p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-extrabold uppercase shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveLogTab('absent')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                        activeLogTab === 'absent' 
                          ? 'bg-white text-rose-700 shadow-3xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>Absences ({monthlyLogs.absentsList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLogTab('present')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                        activeLogTab === 'present' 
                          ? 'bg-white text-emerald-700 shadow-3xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Presences ({monthlyLogs.presentsList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLogTab('withdrawn')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                        activeLogTab === 'withdrawn' 
                          ? 'bg-white text-amber-700 shadow-3xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Withdrawn ({monthlyLogs.withdrawnsList.length})</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 min-h-[140px]">
                  <AnimatePresence mode="wait">
                    {activeLogTab === 'absent' ? (
                      <motion.div
                        key="absent-panel"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-2"
                      >
                        {monthlyLogs.absentsList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center py-8 text-slate-400 space-y-2">
                            <CheckCircle className="w-10 h-10 text-emerald-500" />
                            <h5 className="text-xs font-bold text-slate-700">Perfect Month Record!</h5>
                            <p className="text-[10px] text-slate-450 normal-case font-medium">No recorded absences for {selectedStudent.name} in {MONTHS[currentMonth]}.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {monthlyLogs.absentsList.map((log, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between p-3 bg-rose-50/40 hover:bg-rose-50/70 border border-rose-100/40 rounded-xl transition gap-3"
                              >
                                <div className="text-left">
                                  <span className="block text-xs font-black text-rose-950 font-mono">
                                    {log.friendlyDate}, {currentYear}
                                  </span>
                                  {log.note ? (
                                    <span className="block text-[11px] text-slate-500 font-medium italic mt-0.5 flex items-center gap-1">
                                      <FileText className="w-3.5 h-3.5 text-slate-400 inline" />
                                      {log.note}
                                    </span>
                                  ) : (
                                    <span className="block text-[10px] text-slate-405 text-slate-400 font-medium font-sans">No additional comments has been updated.</span>
                                  )}
                                </div>
                                <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest bg-rose-100/40 border border-rose-200/50 px-2 py-0.5 rounded-lg select-none">
                                  Absent
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ) : activeLogTab === 'present' ? (
                      <motion.div
                        key="present-panel"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-2"
                      >
                        {monthlyLogs.presentsList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center py-8 text-slate-400 space-y-2">
                            <Clock className="w-10 h-10 text-slate-300" />
                            <h5 className="text-xs font-bold text-slate-700">No Presence Marked</h5>
                            <p className="text-[10px] text-slate-450 normal-case font-medium">The student is not recorded as present on any academic days in {MONTHS[currentMonth]}.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {monthlyLogs.presentsList.map((log, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between p-3 bg-emerald-50/30 hover:bg-emerald-50/50 border border-emerald-100/40 rounded-xl transition gap-3"
                              >
                                <div className="text-left">
                                  <span className="block text-xs font-black text-emerald-950 font-mono">
                                    {log.friendlyDate}, {currentYear}
                                  </span>
                                  {log.note && (
                                    <span className="block text-[11px] text-slate-500 font-medium italic mt-0.5 flex items-center gap-1">
                                      <FileText className="w-3.5 h-3.5 text-slate-400 inline" />
                                      {log.note}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-100/30 border border-emerald-200/40 px-2 py-0.5 rounded-lg select-none flex items-center gap-1 shadow-3xs">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>Present</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="withdrawn-panel"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-2"
                      >
                        {monthlyLogs.withdrawnsList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center py-8 text-slate-400 space-y-2">
                            <Clock className="w-10 h-10 text-slate-300" />
                            <h5 className="text-xs font-bold text-slate-700">No Withdrawn Log Entries</h5>
                            <p className="text-[10px] text-slate-450 normal-case font-medium">The student is not recorded as withdrawn on any specific days in {MONTHS[currentMonth]}.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {monthlyLogs.withdrawnsList.map((log, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between p-3 bg-amber-50/30 hover:bg-amber-50/50 border border-amber-100/40 rounded-xl transition gap-3"
                              >
                                <div className="text-left">
                                  <span className="block text-xs font-black text-amber-950 font-mono">
                                    {log.friendlyDate}, {currentYear}
                                  </span>
                                  {log.note && (
                                    <span className="block text-[11px] text-slate-500 font-medium italic mt-0.5 flex items-center gap-1">
                                      <FileText className="w-3.5 h-3.5 text-slate-400 inline" />
                                      {log.note}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-100/30 border border-amber-200/40 px-2 py-0.5 rounded-lg select-none flex items-center gap-1 shadow-3xs">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>Withdrawn</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-xs py-20 px-8 flex flex-col items-center justify-center text-center">
              <CalendarIcon className="w-12 h-12 text-slate-350 mb-3 block animate-pulse duration-150" />
              <h4 className="text-sm font-bold text-slate-700">No Student Selected</h4>
              <p className="text-xs text-slate-450 text-slate-400 mt-1 max-w-xs font-medium">Please select a student from the sidebar view to start visualizing calendars, rates, and detailed breakdowns of absences.</p>
            </div>
          )}

        </div>

      </div>

      {/* POPUP MODAL FOR DAY DETAILS (HOLIDAY OR CANCELED STATUS) */}
      <AnimatePresence>
        {selectedCellDate && (() => {
          const isHoliday = activeSectionHolidays.includes(selectedCellDate);
          const sectionCanceled = canceledClasses[activeSection.id] || {};
          const cancelNote = sectionCanceled[selectedCellDate];
          const isCanceled = typeof cancelNote === 'string';
          
          const status = attendance[selectedCellDate]?.[selectedStudentId] || '';
          const note = attendanceNotes[selectedCellDate]?.[selectedStudentId];

          const formattedDate = new Date(selectedCellDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          return (
            <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden"
              >
                {/* Header of Modal */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-150 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Date Information</h4>
                      <p className="text-[10px] text-slate-400 font-bold">{selectedCellDate}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCellDate(null)}
                    className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body of Modal */}
                <div className="p-6 space-y-4">
                  <div className="text-center py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-bold text-slate-700 font-sans">
                    {formattedDate}
                  </div>

                  {/* STATUS CARDS */}
                  <div className="space-y-2.5">
                    
                    {/* HOLIDAY STATUS CARD */}
                    <div className={`p-4 rounded-xl border flex items-start gap-3 transition ${
                      isHoliday 
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
                        : 'bg-slate-50/50 border-slate-100 text-slate-500'
                    }`}>
                      <Coffee className={`w-5 h-5 shrink-0 ${isHoliday ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div className="space-y-1 flex-1 leading-snug">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider">School Holiday</span>
                          {isHoliday && (
                            <span className="px-1.5 py-0.5 bg-amber-100 border border-amber-200 text-amber-800 text-[8px] rounded-sm font-black uppercase">Active</span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-500 font-medium font-sans">
                          {isHoliday 
                            ? 'Marked as school-wide holiday. No student records count toward compliance on holidays.' 
                            : 'This is not a designated school-wide holiday.'}
                        </p>
                      </div>
                    </div>

                    {/* CANCELED STATUS CARD */}
                    <div className={`p-4 rounded-xl border flex items-start gap-3 transition ${
                      isCanceled 
                        ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                        : 'bg-slate-50/50 border-slate-100 text-slate-500'
                    }`}>
                      <CalendarX className={`w-5 h-5 shrink-0 ${isCanceled ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                      <div className="space-y-1 flex-1 leading-snug">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider">Canceled Class</span>
                          {isCanceled && (
                            <span className="px-1.5 py-0.5 bg-rose-100 border border-rose-200 text-rose-800 text-[8px] rounded-sm font-black uppercase">Canceled</span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-500 font-medium font-sans">
                          {isCanceled 
                            ? `Class session was canceled: "${cancelNote}"` 
                            : 'This is an active academic class schedule day.'}
                        </p>
                      </div>
                    </div>

                    {/* STUDENT RECORD RECAP CARD */}
                    {!isHoliday && !isCanceled && selectedStudent && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100/80 space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500 animate-pulse" />
                          <span className="text-xs font-bold text-slate-700">Record for {selectedStudent.name}:</span>
                        </div>
                        <div className="flex items-center justify-between leading-none py-1.5 px-2 bg-white border border-slate-105 rounded-lg text-xs font-extrabold text-slate-800">
                          <span>Attendance:</span>
                          {status === 'present' ? (
                            <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase text-[9px] font-black">Present</span>
                          ) : status === 'absent' ? (
                            <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase text-[9px] font-black">Absent</span>
                          ) : status === 'withdrawn' ? (
                            <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded uppercase text-[9px] font-black">Withdrawn</span>
                          ) : (
                            <span className="text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded uppercase text-[9px] font-bold">Unmarked</span>
                          )}
                        </div>
                        {note && (
                          <div className="p-2 bg-white/70 border border-slate-100 rounded-lg text-[10.5px] text-slate-500 leading-relaxed font-sans italic">
                            &ldquo;{note}&rdquo;
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* HOLIDAY & CANCELED ACTION ZONE FORM */}
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3.5">
                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Manage Status Actions</span>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Toggle Holiday Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isCanceled && onToggleCanceledClass) {
                            onToggleCanceledClass(selectedCellDate, activeSection.id);
                          }
                          onToggleHoliday(selectedCellDate, activeSection.id);
                        }}
                        className={`py-2 px-3 rounded-xl text-[10px] font-black tracking-wide uppercase border flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                          isHoliday
                            ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-amber-700 hover:text-amber-805'
                        }`}
                      >
                        <Coffee className="w-3.5 h-3.5" />
                        <span>{isHoliday ? 'Remove Holiday' : 'Mark Holiday'}</span>
                      </button>

                      {/* Toggle Cancel Class Button */}
                      {onToggleCanceledClass ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isHoliday) {
                              onToggleHoliday(selectedCellDate, activeSection.id);
                            }
                            onToggleCanceledClass(selectedCellDate, activeSection.id, localCancelNote || 'Class canceled');
                          }}
                          className={`py-2 px-3 rounded-xl text-[10px] font-black tracking-wide uppercase border flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                            isCanceled
                              ? 'bg-rose-600 border-rose-700 text-white hover:bg-rose-700'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-rose-750 hover:text-rose-800'
                          }`}
                        >
                          <CalendarX className="w-3.5 h-3.5" />
                          <span>{isCanceled ? 'Remove Cancel' : 'Cancel Class'}</span>
                        </button>
                      ) : (
                        <div className="text-[9.5px] text-slate-400 font-bold text-center border border-dashed border-slate-200 rounded-xl px-2 py-2 flex items-center justify-center">
                          Cancel functions disabled
                        </div>
                      )}
                    </div>

                    {/* Cancel class note inline manager */}
                    {isCanceled && onUpdateCanceledNote && (
                      <div className="space-y-1.5 animate-fade-in pt-1 border-t border-slate-100">
                        <label className="text-[9.5px] text-slate-455 font-black uppercase tracking-wider block">Reason for cancellation:</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. Inclement Weather, Professional Dev, Sick leave"
                            value={localCancelNote}
                            onChange={e => {
                              setLocalCancelNote(e.target.value);
                              onUpdateCanceledNote(selectedCellDate, activeSection.id, e.target.value);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer of Modal */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedCellDate(null)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-xs"
                  >
                    Close Details
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
