import { useState, useMemo, useEffect } from 'react';
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
  Coffee,
  ArrowUp,
  ArrowDown,
  CalendarX
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
  canceledClasses: Record<string, Record<string, string>>;
  attendanceThreshold?: number;
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
  onToggleHoliday,
  canceledClasses,
  attendanceThreshold = 75
}: WeeklyGridProps) {
  // We base our local active week starting from current week's Monday
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfDate(new Date('2026-05-31')));
  const [hoveredCell, setHoveredCell] = useState<{ studentId: string; dateStr: string } | null>(null);
  const [activeMenuDay, setActiveMenuDay] = useState<string | null>(null);

  const [showSaturday, setShowSaturday] = useState<boolean>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return true;
    try {
      const email = JSON.parse(savedUser).email.toLowerCase().trim();
      const saved = localStorage.getItem(`attendance_${email}_show_saturday`);
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [showSunday, setShowSunday] = useState<boolean>(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    if (!savedUser) return true;
    try {
      const email = JSON.parse(savedUser).email.toLowerCase().trim();
      const saved = localStorage.getItem(`attendance_${email}_show_sunday`);
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleSaturday = () => {
    setShowSaturday(prev => {
      const next = !prev;
      const savedUser = localStorage.getItem('attendance_current_user');
      if (savedUser) {
        try {
          const email = JSON.parse(savedUser).email.toLowerCase().trim();
          localStorage.setItem(`attendance_${email}_show_saturday`, JSON.stringify(next));
        } catch (_) {}
      }
      return next;
    });
  };

  const handleToggleSunday = () => {
    setShowSunday(prev => {
      const next = !prev;
      const savedUser = localStorage.getItem('attendance_current_user');
      if (savedUser) {
        try {
          const email = JSON.parse(savedUser).email.toLowerCase().trim();
          localStorage.setItem(`attendance_${email}_show_sunday`, JSON.stringify(next));
        } catch (_) {}
      }
      return next;
    });
  };

  const sectionHolidays = useMemo(() => {
    return holidays[activeSection.id] || [];
  }, [holidays, activeSection.id]);

  const [isReorderMode, setIsReorderMode] = useState(false);
  const [customStudentIdsOrder, setCustomStudentIdsOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`attendance_student_order_${activeSection.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep reorder state in sync with activeSection.id
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`attendance_student_order_${activeSection.id}`);
      setCustomStudentIdsOrder(saved ? JSON.parse(saved) : []);
    } catch {
      setCustomStudentIdsOrder([]);
    }
  }, [activeSection.id]);

  const handleMoveStudent = (studentId: string, direction: 'up' | 'down') => {
    const filtered = students.filter(s => s.sectionId === activeSection.id);
    let resolvedOrder = [...customStudentIdsOrder];

    // Ensure all current section students are in the resolvedOrder list
    filtered.forEach(s => {
      if (!resolvedOrder.includes(s.id)) {
        resolvedOrder.push(s.id);
      }
    });

    // Keep only the active section students in our resolved list
    const filteredIds = filtered.map(s => s.id);
    resolvedOrder = resolvedOrder.filter(id => filteredIds.includes(id));

    const index = resolvedOrder.indexOf(studentId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= resolvedOrder.length) return;

    // Swap
    const temp = resolvedOrder[index];
    resolvedOrder[index] = resolvedOrder[newIndex];
    resolvedOrder[newIndex] = temp;

    setCustomStudentIdsOrder(resolvedOrder);
    localStorage.setItem(`attendance_student_order_${activeSection.id}`, JSON.stringify(resolvedOrder));
  };

  // Filter and sort students for active section
  const sectionStudents = useMemo(() => {
    const filtered = students.filter(s => s.sectionId === activeSection.id);
    if (customStudentIdsOrder.length === 0) return filtered;

    // Sort based on customStudentIdsOrder index
    const sorted = [...filtered].sort((a, b) => {
      let idxA = customStudentIdsOrder.indexOf(a.id);
      let idxB = customStudentIdsOrder.indexOf(b.id);
      if (idxA === -1) idxA = 9999;
      if (idxB === -1) idxB = 9999;
      return idxA - idxB;
    });
    return sorted;
  }, [students, activeSection.id, customStudentIdsOrder]);

  // Generate week dates (Monday ... Sunday, filtered according to weekend toggles)
  const weekDates = useMemo(() => {
    const fullWeek = getWeekDates(weekStart);
    return fullWeek.filter(d => {
      const day = d.getDay();
      if (day === 6 && !showSaturday) return false;
      if (day === 0 && !showSunday) return false;
      return true;
    });
  }, [weekStart, showSaturday, showSunday]);

  // Format week range label
  const weekRangeLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    
    if (!start || !end) return '';
    
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
    } else if (currentStatus === 'absent') {
      onUpdateAttendance(dateStr, studentId, 'withdrawn');
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
        const sectionCanceled = canceledClasses[activeSection.id] || {};
        if (sectionHolidays.includes(dateStr) || sectionCanceled[dateStr] !== undefined) {
          return; // Skip holiday and canceled calculations for all students
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

          {/* Weekend Toggle Controls */}
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-1 px-3 rounded-xl border border-white/10 shadow-inner min-h-[38px]">
            <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">Weekends:</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSaturday}
                onChange={handleToggleSaturday}
                className="rounded border-white/25 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 bg-white/15 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-white">Sat</span>
            </label>
            <span className="text-white/15 text-xs font-light">|</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSunday}
                onChange={handleToggleSunday}
                className="rounded border-white/25 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 bg-white/15 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-white">Sun</span>
            </label>
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
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 animate-fadeIn">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
                <span>Weekly Mark-Sheet</span>
              </h3>
              
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={() => setIsReorderMode(prev => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border cursor-pointer select-none transition-all shadow-3xs duration-150 ${
                    isReorderMode 
                      ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700' 
                      : 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-indigo-100/60'
                  }`}
                  title="Manually sort students in the list using Up/Down buttons"
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  <span>{isReorderMode ? 'Done Sorting' : 'Rearrange List'}</span>
                </button>
                {isReorderMode && customStudentIdsOrder.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStudentIdsOrder([]);
                      localStorage.removeItem(`attendance_student_order_${activeSection.id}`);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-black uppercase text-slate-500 rounded-lg cursor-pointer transition select-none shadow-3xs"
                    title="Reset custom student arrangement back to original list"
                  >
                    <span>Reset Order</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-normal">
              {isReorderMode ? (
                <span className="text-indigo-600 font-semibold flex items-center gap-1">
                  <span>★ Rearrange mode active: click ▲ or ▼ next to student names to move them up or down.</span>
                </span>
              ) : (
                <span>Click individual cell circles to rotate states: <strong className="text-emerald-500">Present (🟢)</strong> → <strong className="text-rose-500">Absent (🔴)</strong> → <strong className="text-slate-400">Unrecorded (⚪)</strong></span>
              )}
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
                  </th>                  {/* Monday to Sunday day headers */}
                  {weekDates.map((dateObj, idx) => {
                    const dateStr = formatDateKey(dateObj);
                    const formattedDisplayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const isSubmitted = (submittedDates[activeSection.id] || []).includes(dateStr);
                    const isDayHoliday = sectionHolidays.includes(dateStr);
                    const isDayMenuOpen = activeMenuDay === dateStr;

                    const sectionCanceled = canceledClasses[activeSection.id] || {};
                    const cancelReason = sectionCanceled[dateStr];
                    const isDayCanceled = typeof cancelReason === 'string';

                    return (
                      <th
                        key={idx}
                        className={`relative px-3 py-3.5 text-center text-xs border-r border-slate-100 w-[110px] transition-colors duration-150 ${
                          isDayCanceled 
                            ? 'bg-rose-50/20 border-t-4 border-t-rose-400' 
                            : isDayHoliday 
                              ? 'bg-amber-50/25 border-t-4 border-t-amber-400' 
                              : ''
                        }`}
                        title={isDayCanceled ? `Canceled: "${cancelReason}"` : isDayHoliday ? 'School Holiday' : ''}
                      >
                        <div className="space-y-1 select-none flex flex-col items-center">
                          <p className={`font-extrabold tracking-wide flex items-center justify-center gap-1 ${isDayCanceled ? 'text-rose-800' : isDayHoliday ? 'text-amber-800' : 'text-slate-800'}`}>
                            {isDayCanceled ? (
                              <CalendarX className="w-3.5 h-3.5 text-rose-550 animate-pulse shrink-0" />
                            ) : isDayHoliday ? (
                              <Coffee className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                            ) : null}
                            {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <p className={`font-mono text-[10px] font-black ${isDayCanceled ? 'text-rose-600/70' : isDayHoliday ? 'text-amber-600/70' : 'text-slate-400'}`}>
                            {formattedDisplayDate}
                          </p>
                          {isDayCanceled && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-black rounded-md tracking-wider text-center select-none" title={`Canceled: ${cancelReason}`}>
                              CANCELED
                            </span>
                          )}
                          {isDayHoliday && !isDayCanceled && (
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
                          {isSubmitted && !isDayHoliday && !isDayCanceled && (
                            <span className="inline-block scale-90 px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded border border-emerald-150">
                              Locked
                            </span>
                          )}
                        </div>

                        {/* Quick Action Bulk Setter dropdown */}
                        <div className="mt-2.5 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={isDayCanceled}
                            onClick={() => setActiveMenuDay(isDayMenuOpen ? null : dateStr)}
                            className={`text-[9px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150/40 px-2 py-0.5 rounded cursor-pointer transition select-none flex items-center gap-0.5 ${
                              isDayCanceled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
                            }`}
                          >
                            <span>Set All</span>
                            <span className="text-[7px]">▼</span>
                          </button>

                          {/* Float Custom Dropdown modal layout */}
                          {isDayMenuOpen && !isDayCanceled && (
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
                {sectionStudents.map((student, studentIndex) => {
                  const statsObj = studentWeekProgressList.find(s => s.studentId === student.id);
                  const accuracyValue = statsObj?.percentage;

                  return (
                    <tr key={student.id} className={`hover:bg-slate-50/40 transition ${student.isWithdrawn ? 'opacity-85' : ''}`}>
                      {/* Name of single Student */}
                      <td className="sticky left-0 bg-white z-10 pl-6 pr-4 py-3.5 font-bold text-slate-700 truncate border-r border-slate-100/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.03)] group-hover:bg-slate-50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isReorderMode && (
                              <div className="inline-flex items-center gap-0.5 shrink-0 bg-slate-100 rounded-md p-0.5 select-none animate-fadeIn mr-1">
                                <button
                                  type="button"
                                  disabled={studentIndex === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveStudent(student.id, 'up');
                                  }}
                                  className={`p-0.5 rounded transition cursor-pointer ${
                                    studentIndex === 0 
                                      ? 'text-slate-300 cursor-not-allowed opacity-40' 
                                      : 'text-indigo-650 hover:bg-white active:scale-90 hover:shadow-3xs'
                                  }`}
                                  title="Move student up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={studentIndex === sectionStudents.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveStudent(student.id, 'down');
                                  }}
                                  className={`p-0.5 rounded transition cursor-pointer ${
                                    studentIndex === sectionStudents.length - 1
                                      ? 'text-slate-300 cursor-not-allowed opacity-40' 
                                      : 'text-indigo-650 hover:bg-white active:scale-90 hover:shadow-3xs'
                                  }`}
                                  title="Move student down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            <p className={`font-semibold text-xs truncate max-w-[140px] ${student.isWithdrawn ? 'text-slate-400 line-through decoration-rose-300' : 'text-slate-800'}`} title={student.name}>
                              {student.name}
                            </p>
                            {student.isWithdrawn && (
                              <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded text-[8px] font-black uppercase tracking-wider shrink-0 select-none">
                                Withdrawn
                              </span>
                            )}
                          </div>
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

                        const sectionCanceled = canceledClasses[activeSection.id] || {};
                        const cancelReason = sectionCanceled[dateStr];
                        const isDayCanceled = typeof cancelReason === 'string';

                        const isInactive = isDayHoliday || isDayCanceled;

                        let colorClass = 'bg-slate-50 border-slate-200 border-dashed hover:border-slate-450 hover:bg-slate-100/50';
                        let dotContent = null;
                        let cellTitle = 'Click to mark as Present';

                        if (isDayCanceled) {
                          colorClass = 'bg-rose-50 border border-dashed border-rose-300 text-rose-800 cursor-not-allowed';
                          dotContent = <CalendarX className="w-5 h-5 text-rose-500 animate-pulse shrink-0" />;
                          cellTitle = `Canceled Class: "${cancelReason}"\nExcluded from Calculations`;
                        } else if (isDayHoliday) {
                          colorClass = 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed';
                          dotContent = <Coffee className="w-5 h-5 text-amber-500/80 shrink-0" />;
                          cellTitle = 'Holiday - Excluded from Calculations';
                        } else if (status === 'present') {
                          colorClass = 'bg-emerald-500 border-emerald-400 text-white shadow-xs';
                          dotContent = <Check className="w-[18px] h-[18px] text-white stroke-[4.5px]" />;
                          cellTitle = 'Recorded: Present\nClick to change to Absent';
                        } else if (status === 'absent') {
                          colorClass = 'bg-rose-500 border-rose-400 text-white shadow-xs';
                          dotContent = <X className="w-[18px] h-[18px] text-white stroke-[4.5px]" />;
                          cellTitle = 'Recorded: Absent\nClick to change to Withdrawn';
                        } else if (status === 'withdrawn') {
                          colorClass = 'bg-amber-500 border-amber-400 text-white shadow-xs';
                          dotContent = <AlertCircle className="w-[18px] h-[18px] text-white stroke-[4.5px]" />;
                          cellTitle = 'Recorded: Withdrawn\nClick to clear / remove record';
                        }
 
                        return (
                          <td
                            key={idx}
                            className={`px-3 py-3.5 border-r border-slate-100 text-center align-middle transition-colors ${isInactive ? 'bg-slate-100/30' : ''}`}
                            onMouseEnter={isInactive ? undefined : () => setHoveredCell({ studentId: student.id, dateStr })}
                            onMouseLeave={isInactive ? undefined : () => setHoveredCell(null)}
                          >
                            <div className="flex justify-center items-center">
                              <button
                                type="button"
                                onClick={isInactive ? undefined : () => handleCellClick(student.id, dateStr)}
                                className={`w-11.5 h-11.5 w-[46px] h-[46px] rounded-full border-2.5 flex items-center justify-center transition-all duration-200 select-none relative ${
                                  isInactive 
                                    ? colorClass 
                                    : `cursor-pointer hover:scale-108 active:scale-90 ${colorClass}`
                                }`}
                                title={cellTitle}
                                disabled={isInactive}
                              >
                                {dotContent}
                                {isHovered && !status && !isInactive && (
                                  <span className="text-sm font-black text-indigo-500 opacity-60 font-mono animate-pulse">
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
                            accuracyValue !== null && accuracyValue < attendanceThreshold 
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
      <div id="weekly-board-info-pills" className="bg-slate-50/50 rounded-xl border border-slate-150 p-4 space-y-2">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
          <span>Helpful Tips for Weekly Management</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-500">
          <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
            <span className="font-bold text-indigo-650 text-[10px] block">Cycle Attendance</span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Click any cell circle. Cycles through <span className="text-emerald-600 font-semibold">Present (🟢)</span> → <span className="text-rose-500 font-semibold">Absent (🔴)</span> → Empty.
            </p>
          </div>
          <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
            <span className="font-bold text-indigo-650 text-[10px] block">Set Entire Day</span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Use the <span className="font-semibold text-slate-700">"Set All" menu</span> on headers to instantly mark or clear an entire day.
            </p>
          </div>
          <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 space-y-1">
            <span className="font-bold text-indigo-650 text-[10px] block">Jump & Browse Weeks</span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Use the date picker or navigation arrows in the header card to load and edit archives seamlessly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
