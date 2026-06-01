import { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  Award,
  AlertTriangle,
  UserCheck,
  CheckSquare,
  AlertCircle,
  Users,
  Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Section, AttendanceMap, AttendanceStatus } from '../types';

interface WeeklyGridProps {
  activeSection: Section;
  students: Student[];
  attendance: AttendanceMap;
  onUpdateAttendance: (date: string, studentId: string, status: AttendanceStatus) => void;
  onBulkUpdateAttendance: (date: string, studentIds: string[], status: AttendanceStatus) => void;
  onClearAttendance: (date: string, studentIds: string[]) => void;
  submittedDates: Record<string, string[]>;
  holidays: Record<string, string[]>;
  onToggleHoliday: (date: string, sectionId: string) => void;
}

// Format Date object to YYYY-MM-DD
const formatDateKey = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Given any Date object, returned the Date of the Monday of its week
const getMondayOfDate = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Monday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Generate 7 Date occurrences starting from Monday
const getWeekDates = (monday: Date): Date[] => {
  const list: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    list.push(current);
  }
  return list;
};

export default function WeeklyGrid({
  activeSection,
  students,
  attendance,
  onUpdateAttendance,
  onBulkUpdateAttendance,
  onClearAttendance,
  submittedDates,
  holidays,
  onToggleHoliday
}: WeeklyGridProps) {
  // We base our local active week starting from current week's Monday
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfDate(new Date('2026-05-31')));
  const [hoveredCell, setHoveredCell] = useState<{ studentId: string; dateStr: string } | null>(null);
  const [activeMenuDay, setActiveMenuDay] = useState<string | null>(null);

  const sectionHolidays = useMemo(() => {
    return holidays[activeSection.id] || [];
  }, [holidays, activeSection.id]);

  // Filter students for active section
  const sectionStudents = useMemo(() => {
    return students.filter(s => s.sectionId === activeSection.id);
  }, [students, activeSection.id]);

  // Generate week dates (Monday ... Sunday)
  const weekDates = useMemo(() => {
    return getWeekDates(weekStart);
  }, [weekStart]);

  // Format week range label
  const weekRangeLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `${startStr} – ${endStr}`;
  }, [weekDates]);

  // Cycle Week functions
  const handlePrevWeek = () => {
    setWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handleCurrentWeek = () => {
    setWeekStart(getMondayOfDate(new Date('2026-05-31')));
  };

  const handleCustomDateChange = (val: string) => {
    if (!val) return;
    const parts = val.split('-');
    // Parse as local timezone to avoid off-by-one shifts
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    setWeekStart(getMondayOfDate(d));
  };

  // Toggle state handle
  const handleCellClick = (studentId: string, dateStr: string) => {
    const currentStatus = attendance[dateStr]?.[studentId];
    if (!currentStatus) {
      onUpdateAttendance(dateStr, studentId, 'present');
    } else if (currentStatus === 'present') {
      onUpdateAttendance(dateStr, studentId, 'absent');
    } else {
      onClearAttendance(dateStr, [studentId]);
    }
  };

  // Bulk actions handles
  const handleBulkDayMark = (dateStr: string, status: AttendanceStatus | 'clear') => {
    const studentIds = sectionStudents.map(s => s.id);
    if (studentIds.length === 0) return;

    if (status === 'clear') {
      onClearAttendance(dateStr, studentIds);
    } else {
      onBulkUpdateAttendance(dateStr, studentIds, status);
    }
    setActiveMenuDay(null);
  };

  // Student level bulk action
  const handleBulkStudentMark = (studentId: string, status: AttendanceStatus | 'clear') => {
    if (status === 'clear') {
      weekDates.forEach(d => {
        const dateStr = formatDateKey(d);
        onClearAttendance(dateStr, [studentId]);
      });
    } else {
      weekDates.forEach(d => {
        const dateStr = formatDateKey(d);
        onUpdateAttendance(dateStr, studentId, status);
      });
    }
  };

  // Statistics calculation for the active week for each student (excluding holidays)
  const studentWeekProgressList = useMemo(() => {
    return sectionStudents.map(student => {
      let presents = 0;
      let absents = 0;
      let totalLogged = 0;

      weekDates.forEach(d => {
        const dateStr = formatDateKey(d);
        if (sectionHolidays.includes(dateStr)) {
          return; // Skip holiday calculations for all students
        }
        const st = attendance[dateStr]?.[student.id];
        if (st === 'present') {
          presents++;
          totalLogged++;
        } else if (st === 'absent') {
          absents++;
          totalLogged++;
        }
      });

      const percentage = totalLogged > 0 ? Math.round((presents / totalLogged) * 100) : null;

      return {
        studentId: student.id,
        presents,
        absents,
        totalLogged,
        percentage
      };
    });
  }, [sectionStudents, weekDates, attendance, sectionHolidays]);

  // Core week calculations
  const weekPerformanceMean = useMemo(() => {
    const validScores = studentWeekProgressList
      .map(s => s.percentage)
      .filter((p): p is number => p !== null);
    
    if (validScores.length === 0) return null;
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  }, [studentWeekProgressList]);

  return (
    <div id="weekly-board-root" className="space-y-6">
      
      {/* Interactive Controller & Overview Cards */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-700/30 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        
        {/* Left Side: Week Title & Range */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-indigo-500/20 text-indigo-200 text-[10px] font-black uppercase tracking-wider rounded-full border border-indigo-500/30">
              Weekly View Dashboard
            </span>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[10px] font-black tracking-normal">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Full-Interact Board</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white font-display flex items-center gap-2 flex-wrap">
              <span>Roster Grid for Week</span>
            </h2>
            <p className="text-sm font-semibold text-indigo-255 opacity-90 mt-1 font-mono">
              {weekRangeLabel}
            </p>
          </div>
        </div>

        {/* Center Side: Week Navigation & Picker */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Nav arrows Group */}
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-xs p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-white/10 active:scale-95 rounded-lg text-slate-350 hover:text-white transition cursor-pointer"
              title="Previous Week (-7 days)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentWeek}
              className="px-3 py-1.5 hover:bg-white/10 active:scale-95 rounded-lg text-xs font-bold text-indigo-150 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              title="Go with Selected/Current Attendance Week"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Today's Week</span>
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-white/10 active:scale-95 rounded-lg text-slate-350 hover:text-white transition cursor-pointer"
              title="Next Week (+7 days)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Custom start day Date-Picker */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Jump:</span>
            <input
              id="weekly-custom-date-picker"
              type="date"
              value={formatDateKey(weekStart)}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              className="bg-white/10 border border-white/15 hover:border-white/30 text-white font-mono text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
              title="Toggle or pick a date to center that specific academic week"
            />
          </div>
        </div>

        {/* Right Side: Week Summary Rate Metric */}
        <div className="flex items-center gap-4 border-t xl:border-t-0 xl:border-l border-white/10 pt-4 xl:pt-0 xl:pl-6">
          <div className="bg-indigo-900/30 border border-white/5 rounded-2xl p-3.5 py-2.5 min-w-[130px] shadow-2xs">
            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider block">Est. Week Average</span>
            <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
              {weekPerformanceMean !== null ? `${weekPerformanceMean}%` : 'No logs'}
            </span>
          </div>
        </div>
      </div>

      {/* Roster Sheet Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        
        {/* Board Header & Info */}
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
              <span>Weekly Mark-Sheet</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Click individual cell circles to rotate states: <strong className="text-emerald-500">Present (🟢)</strong> → <strong className="text-rose-500">Absent (🔴)</strong> → <strong className="text-slate-400">Unrecorded (⚪)</strong>
            </p>
          </div>
          
          {/* Small Legend indicators */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-300" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-350 border-dashed" />
              <span>No Record</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                <Coffee className="w-3 h-3 text-amber-500" />
              </span>
              <span>Holiday (Excluded)</span>
            </div>
          </div>
        </div>

        {sectionStudents.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No students found associated with this section</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Please go to the "Manage Students" tab to add students to the {activeSection.name} roster.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-[900px] table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150">
                  {/* Sticky student list column header */}
                  <th className="sticky left-0 bg-slate-50 z-20 pl-6 pr-4 py-3.5 text-xs font-black text-slate-500 uppercase tracking-widest border-r border-slate-150/60 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.03)] w-[220px]">
                    Student Name
                  </th>
                  
                  {/* Monday to Sunday day headers */}
                  {weekDates.map((dateObj, idx) => {
                    const dateStr = formatDateKey(dateObj);
                    const formattedDisplayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const isSubmitted = (submittedDates[activeSection.id] || []).includes(dateStr);
                    const isDayHoliday = sectionHolidays.includes(dateStr);
                    const isDayMenuOpen = activeMenuDay === dateStr;

                    return (
                      <th
                        key={idx}
                        className={`relative px-3 py-3.5 text-center text-xs border-r border-slate-100 w-[110px] transition-colors duration-150 ${
                          isDayHoliday ? 'bg-amber-50/25 border-t-4 border-t-amber-400' : ''
                        }`}
                      >
                        <div className="space-y-1 select-none flex flex-col items-center">
                          <p className={`font-extrabold tracking-wide flex items-center justify-center gap-1 ${isDayHoliday ? 'text-amber-800' : 'text-slate-800'}`}>
                            {isDayHoliday && <Coffee className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />}
                            {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <p className={`font-mono text-[10px] font-black ${isDayHoliday ? 'text-amber-600/70' : 'text-slate-400'}`}>
                            {formattedDisplayDate}
                          </p>
                          {isDayHoliday && (
                            <button
                              type="button"
                              onClick={() => {
                                onToggleHoliday(dateStr, activeSection.id);
                                setActiveMenuDay(null);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-700 text-[8px] font-black rounded-md cursor-pointer transition select-none tracking-wide text-center"
                              title="Holiday active. Click to unlock/remove."
                            >
                              <Coffee className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                              <span>HOLIDAY</span>
                            </button>
                          )}
                          {isSubmitted && !isDayHoliday && (
                            <span className="inline-block scale-90 px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded border border-emerald-150">
                              Locked
                            </span>
                          )}
                        </div>

                        {/* Quick Action Bulk Setter dropdown */}
                        <div className="mt-2.5 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveMenuDay(isDayMenuOpen ? null : dateStr)}
                            className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150/40 px-2 py-0.5 rounded cursor-pointer transition select-none flex items-center gap-0.5"
                          >
                            <span>Set All</span>
                            <span className="text-[7px]">▼</span>
                          </button>

                          {/* Float Custom Dropdown modal layout */}
                          {isDayMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActiveMenuDay(null)} />
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-white border border-slate-150 rounded-xl shadow-lg p-2.5 z-40 w-44 space-y-1.5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 pb-1">
                                  Set entire day:
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleBulkDayMark(dateStr, 'present')}
                                  disabled={isDayHoliday}
                                  className={`w-full text-left text-xs font-bold p-1.5 rounded-lg flex items-center gap-1.5 ${
                                    isDayHoliday ? 'text-slate-350 cursor-not-allowed opacity-50' : 'text-emerald-700 hover:bg-emerald-50/50 cursor-pointer'
                                  }`}
                                >
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                  <span>All Present (🟢)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkDayMark(dateStr, 'absent')}
                                  disabled={isDayHoliday}
                                  className={`w-full text-left text-xs font-bold p-1.5 rounded-lg flex items-center gap-1.5 ${
                                    isDayHoliday ? 'text-slate-350 cursor-not-allowed opacity-50' : 'text-rose-700 hover:bg-rose-50/50 cursor-pointer'
                                  }`}
                                >
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                                  <span>All Absent (🔴)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkDayMark(dateStr, 'clear')}
                                  disabled={isDayHoliday}
                                  className={`w-full text-left text-xs font-bold p-1.5 rounded-lg flex items-center gap-1.5 ${
                                    isDayHoliday ? 'text-slate-350 cursor-not-allowed opacity-50' : 'text-slate-500 hover:bg-slate-50 cursor-pointer'
                                  }`}
                                >
                                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                                  <span>Clear Entries (⚪)</span>
                                </button>

                                <div className="border-t border-slate-100 pt-1.5 mt-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    onToggleHoliday(dateStr, activeSection.id);
                                    setActiveMenuDay(null);
                                  }}
                                  className={`w-full text-left text-[11px] font-bold p-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer border ${
                                    isDayHoliday 
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' 
                                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-150'
                                  }`}
                                >
                                  <Coffee className={`w-3.5 h-3.5 shrink-0 ${isDayHoliday ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                                  <span>{isDayHoliday ? 'Remove Holiday' : 'Mark Holiday 🏖️'}</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  
                  {/* Right boundary column for Weekly Summary percentage rate visual */}
                  <th className="px-5 py-3.5 text-center text-xs font-black text-slate-500 uppercase tracking-widest w-[110px]">
                    Week score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                {sectionStudents.map((student) => {
                  const statsObj = studentWeekProgressList.find(s => s.studentId === student.id);
                  const accuracyValue = statsObj?.percentage;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/40 transition">
                      {/* Name of single Student */}
                      <td className="sticky left-0 bg-white z-10 pl-6 pr-4 py-3.5 font-bold text-slate-700 truncate border-r border-slate-100/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.03)] group-hover:bg-slate-50">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800 text-xs truncate max-w-[150px]" title={student.name}>
                            {student.name}
                          </p>
                          <div className="flex gap-2 items-center flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleBulkStudentMark(student.id, 'present')}
                              className="text-[8px] font-black text-emerald-600 hover:underline px-0.5"
                              title="Bulk mark this student as present for this entire week"
                            >
                              Set week P
                            </button>
                            <span className="text-slate-300 text-[8px]">•</span>
                            <button
                              type="button"
                              onClick={() => handleBulkStudentMark(student.id, 'clear')}
                              className="text-[8px] font-black text-slate-400 hover:underline px-0.5"
                              title="Clear all records for this student this week"
                            >
                              Clear week
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 7 columns cell iteration */}
                      {weekDates.map((dateObj, idx) => {
                        const dateStr = formatDateKey(dateObj);
                        const status = attendance[dateStr]?.[student.id];
                        const isHovered = hoveredCell?.studentId === student.id && hoveredCell?.dateStr === dateStr;
                        const isDayHoliday = sectionHolidays.includes(dateStr);

                        let colorClass = 'bg-slate-50 border-slate-200 border-dashed hover:border-slate-450 hover:bg-slate-100/50';
                        let dotContent = null;
                        let cellTitle = 'Click to mark as Present';

                        if (isDayHoliday) {
                          colorClass = 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed';
                          dotContent = <Coffee className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />;
                          cellTitle = 'Holiday - Excluded from Calculations';
                        } else if (status === 'present') {
                          colorClass = 'bg-emerald-500 border-emerald-400 text-white shadow-xs';
                          dotContent = <Check className="w-2.5 h-2.5 text-white stroke-[4px]" />;
                          cellTitle = 'Recorded: Present\nClick to change to Absent';
                        } else if (status === 'absent') {
                          colorClass = 'bg-rose-500 border-rose-400 text-white shadow-xs';
                          dotContent = <X className="w-2.5 h-2.5 text-white stroke-[4px]" />;
                          cellTitle = 'Recorded: Absent\nClick to clear / remove record';
                        }

                        return (
                          <td
                            key={idx}
                            className={`px-3 py-3.5 border-r border-slate-100 text-center align-middle transition-colors ${isDayHoliday ? 'bg-slate-100/30' : ''}`}
                            onMouseEnter={isDayHoliday ? undefined : () => setHoveredCell({ studentId: student.id, dateStr })}
                            onMouseLeave={isDayHoliday ? undefined : () => setHoveredCell(null)}
                          >
                            <div className="flex justify-center items-center">
                              <button
                                type="button"
                                onClick={isDayHoliday ? undefined : () => handleCellClick(student.id, dateStr)}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 select-none relative ${
                                  isDayHoliday 
                                    ? colorClass 
                                    : `cursor-pointer hover:scale-108 active:scale-90 ${colorClass}`
                                }`}
                                title={cellTitle}
                                disabled={isDayHoliday}
                              >
                                {dotContent}
                                {isHovered && !status && !isDayHoliday && (
                                  <span className="text-[10px] font-black text-indigo-500 opacity-60 font-mono animate-pulse">
                                    +
                                  </span>
                                )}
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Average score column display */}
                      <td className="px-5 py-3.5 text-center font-mono align-middle">
                        <div className="space-y-1">
                          <p className={`font-black text-xs ${
                            accuracyValue !== null && accuracyValue < 75 
                              ? 'text-rose-600' 
                              : accuracyValue === 100 
                              ? 'text-amber-600'
                              : 'text-slate-800'
                          }`}>
                            {accuracyValue !== null ? `${accuracyValue}%` : '—'}
                          </p>
                          {accuracyValue !== null && (
                            <p className="text-[9px] text-slate-400 font-bold">
                              {statsObj.presents} / {statsObj.totalLogged} days
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Week overview audit log information card */}
      <div id="weekly-board-info-pills" className="bg-slate-50 rounded-2xl border border-slate-150 p-6 space-y-4">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-slate-400" />
          <span>Helpful Tips for Weekly Management</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-500">
          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-1.5">
            <span className="font-extrabold text-indigo-600 block">Cycle Attendance</span>
            <p className="text-xxs font-medium leading-relaxed">
              Simply click any cell circle. First click turns it <span className="text-emerald-600 font-bold">Present (🟢)</span>. A second click flips it to <span className="text-rose-500 font-bold">Absent (🔴)</span>. Clicking it again restores it to unmarked slate.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-1.5">
            <span className="font-extrabold text-indigo-600 block">Set Entire Day (Bulk)</span>
            <p className="text-xxs font-medium leading-relaxed">
              Use the <span className="font-bold text-slate-700">"Set All" dropdown button</span> inside any day coordinate header. Instantly lock whole day to Present, Absent or Clear existing markers. Very useful for rapid roll-calls!
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-1.5">
            <span className="font-extrabold text-indigo-600 block">Cycle Any Week In History</span>
            <p className="text-xxs font-medium leading-relaxed">
              Use the keyboard-accessible date picker inside the indigo panel or the previous/next week actions to navigate back or forward. Real-time percentages adjust immediately.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
