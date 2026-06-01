import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  FileSpreadsheet, 
  Award, 
  AlertTriangle, 
  CheckCheck, 
  X, 
  TrendingUp, 
  Activity, 
  Info, 
  Download, 
  BookOpen, 
  SlidersHorizontal, 
  RotateCcw,
  Coffee,
  Check
} from 'lucide-react';
import { Student, Section, AttendanceMap, AttendanceStatus } from '../types';

interface MonthlyBoardProps {
  activeSection: Section;
  students: Student[];
  attendance: AttendanceMap;
  submittedDates: Record<string, string[]>;
  sections: Section[];
  holidays: Record<string, string[]>;
}

// Helper to format month strings
const formatMonthName = (yearMonthStr: string): string => {
  try {
    const [year, month] = yearMonthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch (e) {
    return yearMonthStr;
  }
};

export default function MonthlyBoard({
  activeSection,
  students,
  attendance,
  submittedDates,
  sections,
  holidays,
}: MonthlyBoardProps) {
  // Determine all months that have recorded dates or submitted dates, or fall back to default
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Add months from submittedDates
    Object.values(submittedDates).forEach(dates => {
      dates.forEach(d => {
        if (d && d.length >= 7) {
          monthsSet.add(d.substring(0, 7)); // "YYYY-MM"
        }
      });
    });

    // Add months from attendance keys
    Object.keys(attendance).forEach(d => {
      if (d && d.length >= 7) {
        monthsSet.add(d.substring(0, 7)); // "YYYY-MM"
      }
    });

    // Ensure we at least have May 2026 and June 2026 as standard buffers if empty
    if (monthsSet.size === 0) {
      monthsSet.add('2026-05');
      monthsSet.add('2026-06');
    }

    return Array.from(monthsSet).sort().reverse(); // Show latest months first
  }, [submittedDates, attendance]);

  // States
  const [selectedMonth, setSelectedMonth] = useState<string>(() => availableMonths[0] || '2026-05');
  const [classFilter, setClassFilter] = useState<string>('active'); // 'active' | 'all' | sectionId
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'at_risk' | 'perfect'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle month iteration
  const handlePrevMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[idx + 1]);
    }
  };

  const handleNextMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(availableMonths[idx - 1]);
    }
  };

  // Derive final students list for this month according to Class Filter
  const targetStudents = useMemo(() => {
    if (classFilter === 'active') {
      return students.filter(s => s.sectionId === activeSection.id);
    }
    if (classFilter === 'all') {
      return students;
    }
    return students.filter(s => s.sectionId === classFilter);
  }, [students, activeSection.id, classFilter]);

  // Extract all individual dates marked or submitted in the SELECTED MONTH across target section(s)
  const monthlyDates = useMemo(() => {
    const datesSet = new Set<string>();

    // Which sections are we auditing?
    const sectionIdsAudit = classFilter === 'all' 
      ? sections.map(s => s.id) 
      : classFilter === 'active' 
        ? [activeSection.id] 
        : [classFilter];

    sectionIdsAudit.forEach(secId => {
      const dates = submittedDates[secId] || [];
      dates.forEach(d => {
        if (d.startsWith(selectedMonth)) {
          datesSet.add(d);
        }
      });
    });

    // Fall back to actual attendance marks in selected month if no submitted dates
    Object.keys(attendance).forEach(d => {
      if (d.startsWith(selectedMonth)) {
        // Did we mark any target students?
        const hasStudentsMarked = targetStudents.some(s => attendance[d]?.[s.id]);
        if (hasStudentsMarked) {
          datesSet.add(d);
        }
      }
    });

    return Array.from(datesSet).sort(); // chronological
  }, [selectedMonth, classFilter, activeSection.id, sections, submittedDates, attendance, targetStudents]);

  // Compute student metrics for this specific month
  const monthlyCalculations = useMemo(() => {
    return targetStudents.map(student => {
      const studentHolidays = holidays[student.sectionId] || [];
      
      // Filter month dates applicable to this student (e.g. not a holiday for their section)
      const activeMonthDates = monthlyDates.filter(date => !studentHolidays.includes(date));
      const totalMonthDays = activeMonthDates.length;

      let presents = 0;
      let absents = 0;

      activeMonthDates.forEach(date => {
        const records = attendance[date] || {};
        const status = records[student.id];
        
        if (status === 'present') {
          presents++;
        } else if (status === 'absent') {
          absents++;
        } else {
          // Defaults to absent if not marked but other classmates are marked on that day
          absents++;
        }
      });

      const percentage = totalMonthDays > 0 
        ? Math.round((presents / totalMonthDays) * 100) 
        : 100;

      return {
        student,
        presentCount: presents,
        absentCount: absents,
        percentage,
        totalDays: totalMonthDays,
      };
    });
  }, [targetStudents, monthlyDates, attendance, holidays]);

  // Apply filters
  const filteredCalculations = useMemo(() => {
    return monthlyCalculations.filter(item => {
      // 1. Search Query
      const matchesSearch = item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.student.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Performance Query
      if (performanceFilter === 'all') return true;
      if (performanceFilter === 'at_risk') return item.percentage < 75 && item.totalDays > 0;
      if (performanceFilter === 'perfect') return item.percentage === 100 && item.totalDays > 0;
      
      return true;
    });
  }, [monthlyCalculations, searchQuery, performanceFilter]);

  // Sorted Calculations (Name or Percentage)
  const [sortField, setSortField] = useState<'name' | 'percentage'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedCalculations = useMemo(() => {
    return [...filteredCalculations].sort((a, b) => {
      if (sortField === 'name') {
        const result = a.student.name.localeCompare(b.student.name);
        return sortDirection === 'asc' ? result : -result;
      } else {
        const diff = a.percentage - b.percentage;
        return sortDirection === 'asc' ? diff : -diff;
      }
    });
  }, [filteredCalculations, sortField, sortDirection]);

  // Aggregate monthly stats for the filtered classes
  const monthlySummary = useMemo(() => {
    if (monthlyCalculations.length === 0) {
      return { avg: 100, daysTaken: 0, perfectCount: 0, warningCount: 0, peakDay: null, peakRate: null };
    }

    const validCalcs = monthlyCalculations.filter(c => c.totalDays > 0);
    const avg = validCalcs.length > 0 
      ? Math.round(validCalcs.reduce((acc, curr) => acc + curr.percentage, 0) / validCalcs.length)
      : 100;

    const perfectCount = validCalcs.filter(c => c.percentage === 100).length;
    const warningCount = validCalcs.filter(c => c.percentage < 75).length;

    // Detect Peak Attendance Day in the selected month
    let peakDay: string | null = null;
    let peakRate: number | null = null;

    monthlyDates.forEach(date => {
      let dailyPresent = 0;
      let dailyTotal = 0;

      targetStudents.forEach(student => {
        const studentHolidays = holidays[student.sectionId] || [];
        if (studentHolidays.includes(date)) return;

        const status = attendance[date]?.[student.id];
        if (status) {
          dailyTotal++;
          if (status === 'present') {
            dailyPresent++;
          }
        }
      });

      if (dailyTotal > 0) {
        const rate = (dailyPresent / dailyTotal) * 100;
        if (peakRate === null || rate > peakRate) {
          peakRate = Math.round(rate);
          peakDay = date;
        }
      }
    });

    return {
      avg,
      daysTaken: monthlyDates.length,
      perfectCount,
      warningCount,
      peakDay,
      peakRate,
    };
  }, [monthlyCalculations, monthlyDates, targetStudents, attendance, holidays]);

  const handleExportCSV = () => {
    const csvMonthName = formatMonthName(selectedMonth).replace(/[^a-zA-Z0-9]/g, '_');
    const headers = [
      'Student ID',
      'Student Name',
      'Class Level',
      'Intake Period',
      'Month Tracked Days',
      'Presents',
      'Absents',
      'Monthly Attendance Rate'
    ];

    const rows = sortedCalculations.map(({ student, presentCount, absentCount, percentage, totalDays }) => [
      student.id,
      student.name,
      sections.find(s => s.id === student.sectionId)?.name || 'Default',
      student.intake || 'Default Intake',
      totalDays,
      presentCount,
      absentCount,
      `${percentage}%`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodeUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodeUri;
    link.download = `monthly_attendance_${csvMonthName.toLowerCase()}_report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Month Selector Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Monthly Ledger Dashboard</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            Filter, inspect and export complete student rosters formatted as a monthly check-sheet.
          </p>
        </div>

        {/* Picker Controls */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1}
            className="p-1.5 hover:bg-white disabled:opacity-30 rounded-lg text-slate-600 disabled:hover:bg-transparent shadow-2xs transition cursor-pointer"
            title="Older Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs font-black text-slate-705 px-3.5 min-w-[130px] text-center font-display">
            {formatMonthName(selectedMonth)}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={availableMonths.indexOf(selectedMonth) <= 0}
            className="p-1.5 hover:bg-white disabled:opacity-30 rounded-lg text-slate-600 disabled:hover:bg-transparent shadow-2xs transition cursor-pointer"
            title="Newer Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Metrics Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest block">Monthly Average</span>
            <h3 className="text-2xl font-bold text-indigo-700 font-display">{monthlySummary.avg}%</h3>
            <p className="text-xxs text-slate-400">Class metric for {formatMonthName(selectedMonth)}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest block">Calendar Sessions</span>
            <h3 className="text-2xl font-bold text-slate-705 font-display">{monthlySummary.daysTaken} Days</h3>
            <p className="text-xxs text-slate-400">Roll rolls finalized in month</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-500 rounded-2xl border border-slate-100">
            <Calendar className="w-5 h-5 text-slate-450" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest block">Peak Attendance Day</span>
            <h3 className="text-sm font-bold text-emerald-700 font-display">
              {monthlySummary.peakDay ? `${monthlySummary.peakDay.split('-')[2]}th (${monthlySummary.peakRate}%)` : 'No days marked'}
            </h3>
            <p className="text-xxs text-slate-400">Day with highest student turnout</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest block">Stars & At-Risks</span>
            <h3 className="text-2xl font-bold text-slate-700 font-display flex items-baseline gap-2">
              <span className="text-amber-500 flex items-center text-sm font-black">★ {monthlySummary.perfectCount}</span>
              <span className="text-slate-300 text-sm">/</span>
              <span className="text-rose-500 flex items-center text-sm font-black">▲ {monthlySummary.warningCount}</span>
            </h3>
            <p className="text-xxs text-slate-400">Perfect vs &lt;75% risk count</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Grid Controller & Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        
        {/* Dynamic Filters Bar */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            
            {/* Class Filter Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xxs font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-slate-400" />
                Class:
              </span>
              <div className="relative w-full sm:w-44 select-none">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-700 text-[11px] font-bold rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer transition focus:ring-1 focus:ring-indigo-500 shadow-3xs"
                >
                  <option value="active">Active: {activeSection.name}</option>
                  <option value="all">All Classes Combined ({students.length})</option>
                  {sections.map(sec => {
                    const count = students.filter(s => s.sectionId === sec.id).length;
                    return (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} ({count} stds)
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <svg className="fill-current h-3.5 w-3.5" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Performance Filter Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xxs font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                Performance:
              </span>
              <div className="relative w-full sm:w-44 select-none">
                <select
                  value={performanceFilter}
                  onChange={(e) => setPerformanceFilter(e.target.value as any)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-705 text-[11px] font-bold rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer transition focus:ring-1 focus:ring-indigo-500 shadow-3xs"
                >
                  <option value="all">All ({monthlyCalculations.length})</option>
                  <option value="at_risk">At-Risk Cases (Below 75%)</option>
                  <option value="perfect">Perfect Records (100%)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <svg className="fill-current h-3.5 w-3.5" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Reset Defaults */}
            {(classFilter !== 'active' || performanceFilter !== 'all' || searchQuery !== '') && (
              <button
                type="button"
                onClick={() => {
                  setClassFilter('active');
                  setPerformanceFilter('all');
                  setSearchQuery('');
                }}
                className="p-1 px-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
            {/* Search Student Input */}
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 py-1.5 pl-8 pr-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition pl-8 placeholder:text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 whitespace-nowrap bg-emerald-50/30"
              title="Download Monthly Ledger as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Ledger Grid Container */}
        {monthlyDates.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/10 flex flex-col items-center justify-center p-6 space-y-2">
            <Calendar className="w-8 h-8 text-indigo-400 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-700">No school days marked in {formatMonthName(selectedMonth)}</h4>
            <p className="text-[10px] text-slate-400 max-w-sm leading-relaxed">
              No roll-sheets were finalized during this month for the selected class filters. Navigate to 'Mark Attendance' and finalize calendar dates.
            </p>
          </div>
        ) : sortedCalculations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-bold">
            No students matching your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th 
                    onClick={() => {
                      setSortField('name');
                      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                    }}
                    className="sticky left-0 bg-slate-50 border-r border-slate-100 z-10 px-4 py-3 text-left font-extrabold text-slate-450 uppercase tracking-widest cursor-pointer hover:bg-slate-100 text-[10px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Student</span>
                      <span className="text-[9px] text-indigo-600 font-black">{sortField === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>
                  
                  <th 
                    onClick={() => {
                      setSortField('percentage');
                      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                    }}
                    className="px-4 py-3 text-center border-r border-slate-100 font-extrabold text-slate-450 uppercase tracking-widest cursor-pointer hover:bg-slate-100 text-[10px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Rate</span>
                      <span className="text-[9px] text-indigo-600 font-black">{sortField === 'percentage' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>

                  <th className="px-4 py-3 text-center border-r border-slate-100 font-extrabold text-slate-450 uppercase tracking-widest text-[10px]">
                    Ratio
                  </th>

                  {/* Individual Day Columns */}
                  {monthlyDates.map(dateKey => {
                    const day = dateKey.split('-')[2];
                    return (
                      <th
                        key={dateKey}
                        className="px-2 py-3 text-center font-mono font-black text-slate-500 text-[9px] border-r border-slate-100/50 min-w-[42px] hover:bg-slate-100/50"
                        title={dateKey}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-slate-400 font-semibold uppercase text-[8px]">Day</span>
                          <span className="text-slate-800 text-[11px] font-black">{day}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedCalculations.map(({ student, presentCount, absentCount, percentage, totalDays }) => {
                  const isWarning = percentage < 75 && totalDays > 0;
                  const isGold = percentage === 100 && totalDays > 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/20 transition duration-100">
                      {/* Name card - sticky left for handy scrolling */}
                      <td className="sticky left-0 bg-white border-r border-slate-100 z-10 font-bold px-4 py-3 group-hover:bg-slate-50">
                        <div className="flex flex-col min-w-[150px]">
                          <span className="text-slate-800 font-sans truncate">{student.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 select-none">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                              {student.id}
                            </span>
                            {/* Intake tag */}
                            <span className="text-[8px] font-extrabold bg-indigo-50 text-indigo-650 px-1 py-0.2 rounded-sm border border-indigo-100/20">
                              {student.intake || 'Default'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Display percentage */}
                      <td className="px-4 py-3 text-center border-r border-slate-100">
                        <div className="flex items-center justify-center gap-1.5 font-mono font-extrabold">
                          <span className={`${
                            isGold 
                              ? 'text-amber-500' 
                              : isWarning 
                                ? 'text-rose-500' 
                                : 'text-slate-700'
                          }`}>
                            {percentage}%
                          </span>
                          {isGold && <Award className="w-3.5 h-3.5 text-amber-500" title="Perfect Record!" />}
                          {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" title="At risk (Below 75%)" />}
                        </div>
                      </td>

                      {/* Present ratio */}
                      <td className="px-4 py-3 text-center border-r border-slate-100 text-slate-400 font-bold font-mono">
                        <span className="text-emerald-600 font-extrabold">{presentCount}</span>
                        <span>/</span>
                        <span>{totalDays}</span>
                      </td>

                      {/* Day Cells Mapping */}
                      {monthlyDates.map(dateKey => {
                        const studentHolidays = holidays[student.sectionId] || [];
                        const isHoliday = studentHolidays.includes(dateKey);
                        const status: AttendanceStatus | undefined = attendance[dateKey]?.[student.id];

                        return (
                          <td 
                            key={dateKey}
                            className={`p-1.5 text-center border-r border-slate-50 font-sans text-[11px] align-middle ${
                              isHoliday ? 'bg-amber-50/15' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              {isHoliday ? (
                                <span className="p-1 rounded bg-amber-50 text-amber-600 text-[10px]" title="Holiday marked for this group">
                                  <Coffee className="w-3.5 h-3.5" />
                                </span>
                              ) : status === 'present' ? (
                                <span 
                                  className="w-5.5 h-5.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-[10px] animate-fade-in" 
                                  title={`${student.name} was PRESENT on ${dateKey}`}
                                >
                                  P
                                </span>
                              ) : status === 'absent' ? (
                                <span 
                                  className="w-5.5 h-5.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold text-[10px] animate-fade-in" 
                                  title={`${student.name} was ABSENT on ${dateKey}`}
                                >
                                  A
                                </span>
                              ) : (
                                <span 
                                  className="w-5.5 h-5.5 rounded-full bg-slate-50 border border-slate-150 text-slate-400 flex items-center justify-center font-normal text-[10px]" 
                                  title="No roll record found for this day"
                                >
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Footnote */}
      <div className="p-4 bg-indigo-50/30 border border-indigo-150/40 rounded-2xl flex items-start gap-3.5">
        <Info className="w-4 h-4 text-indigo-505 shrink-0 mt-0.5" />
        <div className="text-[11.5px] leading-relaxed text-indigo-850 font-medium">
          <strong className="text-indigo-900 font-bold block mb-0.5">Quick Guide to Ledger Calculations</strong>
          The calculations in this table compute ratios based on the specific month window. If a student is assigned a different Class Level or Intake, their performance updates dynamically. Marks made as <strong className="text-emerald-700">Present (P)</strong> are compared against active school session days (excluding holidays specified in School Settings).
        </div>
      </div>
    </div>
  );
}
