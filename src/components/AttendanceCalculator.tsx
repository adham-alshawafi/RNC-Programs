import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, AlertTriangle, Percent, ArrowUpDown, Flame, TrendingUp, Users, Download, Calendar, RefreshCw, SlidersHorizontal, ArrowRight, Activity, ArrowUpRight, ArrowDownRight, Sparkles, CheckCheck, Loader2, RotateCcw, X } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Student, AttendanceMap, Section } from '../types';

const COLOR_PALETTE = [
  { id: 'indigo', hex: '#4f46e5', bg: 'bg-indigo-50/70', border: 'border-indigo-200/50', text: 'text-indigo-700', dot: 'bg-indigo-600' },
  { id: 'emerald', hex: '#10b981', bg: 'bg-emerald-50/70', border: 'border-emerald-200/50', text: 'text-emerald-700', dot: 'bg-emerald-600' },
  { id: 'amber', hex: '#f59e0b', bg: 'bg-amber-50/70', border: 'border-amber-200/50', text: 'text-amber-700', dot: 'bg-amber-600' },
  { id: 'rose', hex: '#f43f5e', bg: 'bg-rose-50/70', border: 'border-rose-200/50', text: 'text-rose-700', dot: 'bg-rose-600' },
  { id: 'cyan', hex: '#06b6d4', bg: 'bg-cyan-50/70', border: 'border-cyan-200/50', text: 'text-cyan-700', dot: 'bg-cyan-600' },
  { id: 'purple', hex: '#d946ef', bg: 'bg-purple-50/70', border: 'border-purple-200/50', text: 'text-purple-700', dot: 'bg-purple-500' },
  { id: 'sky', hex: '#0ea5e9', bg: 'bg-sky-50/70', border: 'border-sky-200/50', text: 'text-sky-700', dot: 'bg-sky-500' },
  { id: 'orange', hex: '#f97316', bg: 'bg-orange-50/70', border: 'border-orange-200/50', text: 'text-orange-700', dot: 'bg-orange-550' },
];

interface AttendanceCalculatorProps {
  activeSection: Section;
  students: Student[];
  attendance: AttendanceMap;
  submittedDates: Record<string, string[]>; // Section ID -> Dates officially finalized
  sections: Section[];
  selectedDate?: string;
  onSubmitDate?: (date: string, sectionId: string) => void;
  holidays: Record<string, string[]>;
}

export default function AttendanceCalculator({
  activeSection,
  students,
  attendance,
  submittedDates,
  sections,
  selectedDate,
  onSubmitDate,
  holidays,
}: AttendanceCalculatorProps) {
  const [sortField, setSortField] = useState<'name' | 'percentage'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Local Calculation Submission States
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calcProgress, setCalcProgress] = useState<number>(0);
  const [calcStepText, setCalcStepText] = useState<string>('');
  const [calculationComplete, setCalculationComplete] = useState<boolean>(false);

  const dateToUse = selectedDate || '2026-05-31';

  const triggerRollCalculator = () => {
    if (isCalculating) return;
    
    setIsCalculating(true);
    setCalcProgress(0);
    setCalculationComplete(false);
    setCalcStepText('Initializing roll-call ledger audit...');

    const interval = setInterval(() => {
      setCalcProgress(prev => {
        const next = prev + 5;
        
        // Dynamic status text updates
        if (next < 25) {
          setCalcStepText('Scanning student presence databases...');
        } else if (next < 50) {
          setCalcStepText('Assembling attendance maps and indices...');
        } else if (next < 75) {
          setCalcStepText('Computing visual percentiles & trajectory slopes...');
        } else if (next < 95) {
          setCalcStepText('Recalculating weight factors for at-risk triggers...');
        } else {
          setCalcStepText('Committing final records to memory system...');
        }

        if (next >= 100) {
          clearInterval(interval);
          setIsCalculating(false);
          setCalculationComplete(true);
          
          // Trigger the official parent state submission callback if present
          if (onSubmitDate) {
            onSubmitDate(dateToUse, activeSection.id);
          }
          
          // Clear success box after 4 seconds
          setTimeout(() => {
            setCalculationComplete(false);
          }, 4000);
          
          return 100;
        }
        return next;
      });
    }, 60); // 1.2s calculation progression
  };

  // Date Range Selection states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'all' | 'last7' | 'last30' | 'this_month' | 'custom'>('all');

  // Compare Groups states
  const [compareGroups, setCompareGroups] = useState<boolean>(false);
  const [comparisonSectionIds, setComparisonSectionIds] = useState<string[]>(() => sections.map(s => s.id));

  // Attendance Status Filter state
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'at_risk' | 'perfect'>('all');

  // Helper to resolve stable section colors
  const getSectionColor = (secId: string) => {
    const index = sections.findIndex(s => s.id === secId);
    const idx = index >= 0 ? index : 0;
    return COLOR_PALETTE[idx % COLOR_PALETTE.length];
  };

  // Ensure activeSection.id is always in the comparison, and handle toggles
  const activeCompareSectionIds = comparisonSectionIds.includes(activeSection.id)
    ? comparisonSectionIds
    : [...comparisonSectionIds, activeSection.id];

  const toggleCompareSection = (secId: string) => {
    setComparisonSectionIds(prev => {
      if (prev.includes(secId)) {
        // Keep at least one checked
        if (prev.length === 1 && prev[0] === secId) return prev;
        return prev.filter(id => id !== secId);
      } else {
        return [...prev, secId];
      }
    });
  };

  const sectionStudents = students.filter(s => s.sectionId === activeSection.id);
  const sectionSubmittedDates = submittedDates[activeSection.id] || [];

  const formattedSelectedDate = (() => {
    try {
      const parts = dateToUse.split('-');
      const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateToUse;
    }
  })();

  const isSelectedDateSubmitted = sectionSubmittedDates.includes(dateToUse);

  const sectionHolidays = holidays[activeSection.id] || [];

  // Filtered dates based on range selection and excluding holidays
  const filteredSubmittedDates = sectionSubmittedDates.filter(date => {
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    if (sectionHolidays.includes(date)) return false; // Exclude holidays
    return true;
  });

  const totalTrackedDays = filteredSubmittedDates.length;

  // Compile calculations for each student in the active section
  const studentCalculations = sectionStudents.map(student => {
    let presentCount = 0;
    let absentCount = 0;

    filteredSubmittedDates.forEach(date => {
      const records = attendance[date] || {};
      if (records[student.id] === 'present') {
        presentCount++;
      } else if (records[student.id] === 'absent') {
        // Explicitly marked absent
        absentCount++;
      } else {
        // If they exist but not marked on that general date, treat as absent or skip
        absentCount++;
      }
    });

    const attendancePercentage = totalTrackedDays > 0 
      ? Math.round((presentCount / totalTrackedDays) * 100) 
      : 100; // default to 100 if no days tracked yet

    return {
      student,
      presentCount,
      absentCount,
      percentage: attendancePercentage,
    };
  });

  // Calculate Section stats
  const totalStudents = sectionStudents.length;
  const averagePercentage = studentCalculations.length > 0
    ? Math.round(studentCalculations.reduce((sum, item) => sum + item.percentage, 0) / studentCalculations.length)
    : 100;

  // Identify high/low attendance achievers
  const bestAttender = [...studentCalculations]
    .sort((a, b) => b.percentage - a.percentage)[0];
  const lowestAttender = [...studentCalculations]
    .sort((a, b) => a.percentage - b.percentage)[0];

  // Export active section attendance stats to CSV
  const handleExportCSV = () => {
    const headers = [
      'Student ID',
      'Student Name',
      'Section Name',
      'Total Academic Days',
      'Days Present',
      'Days Absent',
      'Attendance Rate'
    ];

    const rows = sortedCalculations.map(({ student, presentCount, absentCount, percentage }) => [
      student.id,
      student.name,
      activeSection.name,
      totalTrackedDays,
      presentCount,
      absentCount,
      `${percentage}%`
    ]);

    const csvString = [
      headers.join(','),
      ...rows.map(cols => cols.map(val => {
        const text = String(val);
        // If content contains comma, quotes or newline, wrap in double quotes & escape existing quotes
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSection.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}_attendance_report.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sorting handlers
  const handleSort = (field: 'name' | 'percentage') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredCalculations = studentCalculations.filter(item => {
    if (attendanceStatusFilter === 'all') return true;
    if (attendanceStatusFilter === 'at_risk') return item.percentage < 75 && totalTrackedDays > 0;
    if (attendanceStatusFilter === 'perfect') return item.percentage === 100 && totalTrackedDays > 0;
    return true;
  });

  const sortedCalculations = [...filteredCalculations].sort((a, b) => {
    let comp = 0;
    if (sortField === 'name') {
      comp = a.student.name.localeCompare(b.student.name);
    } else {
      comp = a.percentage - b.percentage;
    }
    return sortDirection === 'asc' ? comp : -comp;
  });

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset('custom');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset('custom');
  };

  const applyPreset = (preset: 'all' | 'last7' | 'last30' | 'this_month') => {
    setActivePreset(preset);
    const today = new Date('2026-05-31'); // Base of the app current time
    
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'last7') {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      
      const yyyy = past.getFullYear();
      const mm = String(past.getMonth() + 1).padStart(2, '0');
      const dd = String(past.getDate()).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-${dd}`);
      setEndDate('2026-05-31');
    } else if (preset === 'last30') {
      const past = new Date(today);
      past.setDate(today.getDate() - 29);
      const yyyy = past.getFullYear();
      const mm = String(past.getMonth() + 1).padStart(2, '0');
      const dd = String(past.getDate()).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-${dd}`);
      setEndDate('2026-05-31');
    } else if (preset === 'this_month') {
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-01`);
      setEndDate('2026-05-31');
    }
  };

  // Compile trend chart data
  const chartData = [...filteredSubmittedDates].sort().map(date => {
    let presentCount = 0;
    sectionStudents.forEach(student => {
      const records = attendance[date] || {};
      if (records[student.id] === 'present') {
        presentCount++;
      }
    });

    const percent = sectionStudents.length > 0
      ? Math.round((presentCount / sectionStudents.length) * 100)
      : 100;

    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    return {
      date,
      formattedDate,
      percentage: percent,
    };
  });

  // Compile comparison data across multiple sections (excluding holidays per section)
  const comparedSections = sections.filter(s => activeCompareSectionIds.includes(s.id));
  
  const allComparedDatesSet = new Set<string>();
  comparedSections.forEach(sec => {
    const dates = submittedDates[sec.id] || [];
    const secHolidays = holidays[sec.id] || [];
    dates.forEach(date => {
      if (startDate && date < startDate) return;
      if (endDate && date > endDate) return;
      if (secHolidays.includes(date)) return; // Exclude section-specific holiday
      allComparedDatesSet.add(date);
    });
  });
  
  const sortedComparedDates = Array.from(allComparedDatesSet).sort();

  const comparedChartData = sortedComparedDates.map(date => {
    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    
    const row: Record<string, any> = {
      date,
      formattedDate,
    };
    
    comparedSections.forEach(sec => {
      const secHolidays = holidays[sec.id] || [];
      if (secHolidays.includes(date)) {
        row[sec.id] = null;
        return;
      }
      
      const secStudents = students.filter(st => st.sectionId === sec.id);
      let presentCount = 0;
      
      secStudents.forEach(st => {
        const records = attendance[date] || {};
        if (records[st.id] === 'present') {
          presentCount++;
        }
      });
      
      row[sec.id] = secStudents.length > 0
        ? Math.round((presentCount / secStudents.length) * 100)
        : null; // null keeps Recharts from plotting arbitrary zeros
    });
    
    return row;
  });

  // Calculate highest & lowest attending days in range
  const highestDayObj = chartData.length > 0 
    ? [...chartData].sort((a, b) => b.percentage - a.percentage)[0] 
    : null;
  const lowestDayObj = chartData.length > 0 
    ? [...chartData].sort((a, b) => a.percentage - b.percentage)[0] 
    : null;

  // Compute average trend slope
  let trendIndicator: 'improving' | 'declining' | 'stable' = 'stable';
  let trendText = 'Stable Rate';
  if (chartData.length >= 2) {
    const half = Math.floor(chartData.length / 2);
    const firstHalfAvg = chartData.slice(0, half).reduce((sum, item) => sum + item.percentage, 0) / half;
    const secondHalfAvg = chartData.slice(half).reduce((sum, item) => sum + item.percentage, 0) / (chartData.length - half);
    const diff = secondHalfAvg - firstHalfAvg;
    if (diff > 1) {
      trendIndicator = 'improving';
      trendText = `Improving (+${Math.round(diff)}%)`;
    } else if (diff < -1) {
      trendIndicator = 'declining';
      trendText = `Declining (${Math.round(diff)}%)`;
    }
  }

  // Inline Custom tooltip renderer
  const customTooltipRenderer = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 border border-slate-100 rounded-2xl shadow-xl space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {payload[0].payload.formattedDate}
          </p>
          <div className="flex items-center gap-1.5 text-[13px] font-black text-indigo-750 font-display">
            <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span>{payload[0].value}% Attended</span>
          </div>
          <p className="text-[9px] text-slate-400 font-semibold italic">Section daily average</p>
        </div>
      );
    }
    return null;
  };

  // Compare Tooltip renderer
  const compareTooltipRenderer = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-100 rounded-2xl shadow-xl space-y-2.5 min-w-[200px]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">
            {payload[0].payload.formattedDate}
          </p>
          <div className="space-y-1.5">
            {payload.map((item: any, i: number) => {
              const sec = sections.find(s => s.id === item.dataKey);
              if (!sec) return null;
              const colorInfo = getSectionColor(sec.id);
              return (
                <div key={i} className="flex items-center justify-between gap-4 text-xs font-display">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: colorInfo.hex }} />
                    <span className="font-bold text-slate-700 truncate">{sec.name}</span>
                  </div>
                  <span className="font-mono font-black text-indigo-600 shrink-0">
                    {item.value !== null && item.value !== undefined ? `${item.value}%` : 'No logs'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="attendance-calculator-root" className="space-y-6">
      
      {/* Analytics Bento Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Section Average */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Average Attendance</span>
            <h3 className="text-2xl font-bold text-indigo-700 font-display">{averagePercentage}%</h3>
            <p className="text-xxs text-slate-400">Class wide standard metric</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Session Days */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Active Semesters</span>
            <h3 className="text-2xl font-bold text-slate-700 font-display">{totalTrackedDays} Days</h3>
            <p className="text-xxs text-slate-400">Days session logs recorded</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Star Attender */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Star Student</span>
            <h3 className="text-sm font-semibold text-slate-800 truncate font-display">
              {bestAttender && totalTrackedDays > 0 ? bestAttender.student.name : 'No logs yet'}
            </h3>
            <p className="text-xxs text-amber-600 font-extrabold flex items-center gap-0.5 mt-0.5">
              <Award className="w-3 h-3 shrink-0" />
              {bestAttender && totalTrackedDays > 0 ? `${bestAttender.percentage}% Attended` : 'N/A'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl shrink-0">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Needs Checkin */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Needs Checkin</span>
            <h3 className="text-sm font-semibold text-slate-800 truncate font-display">
              {lowestAttender && totalTrackedDays > 0 && lowestAttender.percentage < 75 ? lowestAttender.student.name : 'Todos Green'}
            </h3>
            <p className="text-xxs text-rose-500 font-extrabold flex items-center gap-0.5 mt-0.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {lowestAttender && totalTrackedDays > 0 && lowestAttender.percentage < 75 ? `${lowestAttender.percentage}% Critical` : 'All above threshold'}
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Date Filter Panel */}
      <div id="date-filter-panel" className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 font-display">Date Range Audit Filter</h4>
              <p className="text-[10px] text-slate-400 font-medium">Analyze attendance rates and metrics for custom terms</p>
            </div>
          </div>
          
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'last30', label: 'Last 30 Days' },
              { id: 'this_month', label: 'This Month' },
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xxs font-extrabold cursor-pointer transition-all ${
                  activePreset === preset.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3.5 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Custom Date Inputs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 focus-within:border-indigo-400 focus-within:bg-white transition-colors">
              <label htmlFor="filter-start-date" className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Start</label>
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={e => handleStartDateChange(e.target.value)}
                className="bg-transparent border-none text-xxs text-slate-700 font-bold focus:outline-none w-28 cursor-pointer"
              />
            </div>
            
            <span className="text-slate-300 text-xs hidden sm:block">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>

            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 focus-within:border-indigo-400 focus-within:bg-white transition-colors">
              <label htmlFor="filter-end-date" className="text-[9px] font-black text-slate-400 uppercase tracking-wider">End</label>
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={e => handleEndDateChange(e.target.value)}
                className="bg-transparent border-none text-xxs text-slate-700 font-bold focus:outline-none w-28 cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className="px-3 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xxs font-extrabold cursor-pointer transition-all border border-slate-100 hover:border-rose-100 flex items-center gap-1.5"
                title="Reset date inputs to show all records"
              >
                <RefreshCw className="w-3 h-3 animate-spin duration-150" />
                <span>Reset Dates</span>
              </button>
            )}
          </div>

          {/* Metric Status Badge */}
          <div className="text-[10px] text-slate-500 font-bold bg-indigo-50/20 px-3 py-1.5 rounded-lg border border-indigo-100/10 flex items-center gap-1.5 select-none self-start sm:self-center">
            <span className={`w-1.5 h-1.5 rounded-full ${totalTrackedDays > 0 ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
            <span>
              {totalTrackedDays === 0 
                ? 'No days calculated' 
                : totalTrackedDays === sectionSubmittedDates.length
                ? `Analyzing All-Time (${totalTrackedDays} days)`
                : `Analyzing ${totalTrackedDays} of ${sectionSubmittedDates.length} days`}
            </span>
          </div>
        </div>
      </div>

      {/* Roster Calculator Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 font-display">Student Performance Audits</h3>
            <p className="text-xs text-slate-400">Sort, query, and download complete roll averages</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1 bg-indigo-50/50 px-2.5 py-1.5 rounded-lg select-none">
              <Users className="w-3.5 h-3.5" />
              <span>{totalStudents} Audit Rows</span>
            </div>
            {totalStudents > 0 && (
              <button
                id="export-csv-btn"
                onClick={handleExportCSV}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-700/10 shadow-xs shadow-indigo-100 cursor-pointer"
                title="Download CSV report of current attendance statistics"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filter above the student table */}
        {totalStudents > 0 && totalTrackedDays > 0 && (
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Filter by Performance:</span>
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <select
                    id="attendance-status-filter-dropdown"
                    value={attendanceStatusFilter}
                    onChange={(e) => setAttendanceStatusFilter(e.target.value as any)}
                    className="w-full sm:w-56 appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer transition focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 shadow-2xs"
                  >
                    <option value="all">All Students ({totalStudents})</option>
                    <option value="at_risk">At-Risk Cases (Below 75%)</option>
                    <option value="perfect">Perfect Records (100%)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>

                {attendanceStatusFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setAttendanceStatusFilter('all')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 rounded-xl transition duration-150 text-xs font-bold shrink-0 cursor-pointer active:scale-95 border border-indigo-100/50"
                    title="Clear filter and show all students"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400 font-bold self-end md:self-auto">
              <span>Showing:</span>
              <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                {filteredCalculations.length} / {totalStudents} students
              </span>
            </div>
          </div>
        )}

        {totalStudents === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Add student records to view active percentages and analytics here.
          </div>
        ) : totalTrackedDays === 0 ? (
          <div className="py-12 text-center text-slate-401 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/10 min-h-[220px]">
            <SlidersHorizontal className="w-8 h-8 text-indigo-400/80 animate-pulse" />
            <p className="font-semibold text-slate-600">No attendance records found for the selected date range.</p>
            <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
              No roll-call lists were submitted or finalized for the period between {startDate || 'all-time'} and {endDate || 'all-time'}.
            </p>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="mt-2.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xxs font-extrabold cursor-pointer transition-colors"
            >
              Reset to All-Time
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 select-none text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th 
                    onClick={() => handleSort('name')}
                    className="pl-6 pr-4 py-3 cursor-pointer hover:bg-slate-100/50 hover:text-slate-700 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Student Name</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center">Attended</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th 
                    onClick={() => handleSort('percentage')}
                    className="px-4 py-3 text-right pr-6 cursor-pointer hover:bg-slate-100/50 hover:text-slate-700 transition"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Percentage</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                {sortedCalculations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 font-medium bg-slate-50/5">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-slate-300" />
                        <span>No students matched the status filter "{attendanceStatusFilter === 'at_risk' ? 'At-Risk' : 'Perfect'}".</span>
                        <button
                          type="button"
                          onClick={() => setAttendanceStatusFilter('all')}
                          className="mt-1 text-indigo-600 hover:text-indigo-700 font-bold underline"
                        >
                          Clear Attendance Status Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedCalculations.map(({ student, presentCount, absentCount, percentage }) => {
                    const isWarning = percentage < 75 && totalTrackedDays > 0;
                    const isGold = percentage === 100 && totalTrackedDays > 0;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/30 transition">
                        {/* Name with tag */}
                        <td className="pl-6 pr-4 py-3.5 align-middle">
                          <div className="flex items-center gap-2.5 min-w-[200px]">
                            <span className="font-semibold text-slate-700">{student.name}</span>
                            {isWarning && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[9px] font-bold flex items-center gap-0.5 shrink-0">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Critical
                              </span>
                            )}
                            {isGold && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[9px] font-bold flex items-center gap-0.5 shrink-0">
                                <Award className="w-2.5 h-2.5" />
                                Perfect
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Attended Count */}
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-500">
                          <span className="text-emerald-600">{presentCount}</span> / {totalTrackedDays}
                        </td>

                        {/* Absent Count */}
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-500">
                          <span className="text-rose-500">{absentCount}</span> / {totalTrackedDays}
                        </td>

                        {/* Percentage & Progress Bar */}
                        <td className="px-4 py-3.5 text-right pr-6 align-middle">
                          <div className="flex justify-end items-center gap-3">
                            <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ type: 'spring', stiffness: 85, damping: 15 }}
                                className={`h-full rounded-full ${
                                  isWarning 
                                    ? 'bg-rose-500' 
                                    : percentage >= 90
                                    ? 'bg-indigo-600'
                                    : 'bg-emerald-500'
                                }`}
                              />
                            </div>
                            <span className={`font-mono font-extrabold ${isWarning ? 'text-rose-600' : 'text-slate-800'}`}>
                              {percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Trend Chart Component */}
      {((!compareGroups && totalTrackedDays > 0 && chartData.length > 0) || (compareGroups && comparedChartData.length > 0)) && (
        <div id="attendance-trend-chart-card" className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-5 rounded-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-50">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="p-1.5 bg-indigo-50 rounded-xl text-indigo-600 block">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest font-display">Trajectory Diagnostics</span>
              </div>
              <h3 className="text-sm font-bold text-slate-800 font-display">Daily Attendance Trend Analysis</h3>
              <p className="text-xs text-slate-400">Class presence rates plotted against registered session log dates</p>
            </div>

            {/* Controls & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Compare Groups Switch Button */}
              <button
                type="button"
                onClick={() => setCompareGroups(!compareGroups)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold leading-tight flex items-center gap-2 select-none cursor-pointer transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] ${
                  compareGroups
                    ? 'bg-indigo-600 border-indigo-650 text-white shadow-md shadow-indigo-150'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
                title="Overlay trend lines from multiple academic sections to benchmark performance"
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Compare Groups</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                  compareGroups ? 'bg-indigo-750 text-indigo-105' : 'bg-slate-100 text-slate-500'
                }`}>
                  {compareGroups ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Trajectory Insights badges (only when single group) */}
              {!compareGroups && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="bg-slate-50/60 border border-slate-100/50 rounded-xl px-3.5 py-2 flex flex-col min-w-[110px]">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Trend Behavior</span>
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1 mt-0.5">
                      {trendIndicator === 'improving' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : trendIndicator === 'declining' ? (
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      {trendText}
                    </span>
                  </div>

                  {highestDayObj && (
                    <div className="bg-slate-50/60 border border-slate-100/50 rounded-xl px-3.5 py-2 flex flex-col min-w-[110px]">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Peak Attendance</span>
                      <span className="text-xs font-black text-emerald-600 font-mono mt-0.5">
                        {highestDayObj.formattedDate} ({highestDayObj.percentage}%)
                      </span>
                    </div>
                  )}

                  {lowestDayObj && (
                    <div className="bg-slate-50/60 border border-slate-100/50 rounded-xl px-3.5 py-2 flex flex-col min-w-[110px]">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lowest Attendance</span>
                      <span className="text-xs font-black text-rose-500 font-mono mt-0.5">
                        {lowestDayObj.formattedDate} ({lowestDayObj.percentage}%)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Legend checkbox pills if compareGroups is ON */}
          {compareGroups && (
            <div id="compare-groups-legend-pills" className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100/60 pb-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-display">Benchmarked Groups (Toggle curves)</span>
                <span className="text-[9px] text-indigo-600 font-black flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded">
                  <Activity className="w-3 h-3" /> multi-line overlay
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sections.map(sec => {
                  const isChecked = activeCompareSectionIds.includes(sec.id);
                  const isCurrent = sec.id === activeSection.id;
                  const color = getSectionColor(sec.id);
                  const studentCount = students.filter(s => s.sectionId === sec.id).length;
                  
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => toggleCompareSection(sec.id)}
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold select-none cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 ${
                        isChecked
                          ? `${color.bg} ${color.border} ${color.text} shadow-2xs`
                          : 'bg-white border-slate-100/80 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isChecked ? color.dot : 'bg-slate-300'}`} style={{ backgroundColor: isChecked ? color.hex : undefined }} />
                      <span>
                        {sec.name} {isCurrent && <span className="text-[10px] text-indigo-500 font-black bg-indigo-100/50 px-1 py-0.5 rounded ml-0.5">(Current)</span>}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isChecked ? 'bg-white/80' : 'bg-slate-50 text-slate-400'}`}>
                        {studentCount} stds
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recharts Container */}
          <div className="w-full h-64 sm:h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              {compareGroups ? (
                <LineChart
                  data={comparedChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip content={compareTooltipRenderer} />
                  {comparedSections.map(sec => {
                    const color = getSectionColor(sec.id);
                    const isCurrent = sec.id === activeSection.id;
                    return (
                      <Line
                        key={sec.id}
                        type="monotone"
                        dataKey={sec.id}
                        name={sec.name}
                        stroke={color.hex}
                        strokeWidth={isCurrent ? 3.5 : 2}
                        dot={{ r: isCurrent ? 4.5 : 2.5, strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 6.5 }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              ) : (
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip content={customTooltipRenderer} />
                  <Area 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorAttendance)" 
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Session Record Submission & Recalculation Engine */}
      <div id="recalculation-engine-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-display">Session Attendance Submission Center</h3>
              <p className="text-[10px] text-slate-400 font-medium">Verify active roll call list, finalize official records, and commit to metrics calculations.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 select-none">
            <span className={`w-2 h-2 rounded-full ${isSelectedDateSubmitted ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
            <span className="text-[10px] uppercase font-black text-slate-500">
              {isSelectedDateSubmitted ? 'Committed & Synced' : 'Draft - Awaiting Sync'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Metadata Display */}
          <div className="space-y-2">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target Section Group</span>
              <span className="text-xs font-bold text-slate-700 font-display">{activeSection.name}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Academic Session Date</span>
              <span className="text-xs font-bold text-slate-700 font-mono">{formattedSelectedDate}</span>
            </div>
          </div>

          {/* Detailed Status Explanation */}
          <div className="p-4 rounded-xl border bg-slate-50/50 flex items-start gap-3 border-slate-100">
            {isSelectedDateSubmitted ? (
              <>
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 font-display">Records Finalized</h4>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Visually rendered attendance rates and Recharts timeline logs are permanently locked with real data.</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 animate-pulse">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 font-display">Changes Awaiting Audit</h4>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Roll call values are stored but not final. Recalculate to append to cumulative percentages.</p>
                </div>
              </>
            )}
          </div>

          {/* Core Trigger Button */}
          <div className="flex justify-end">
            <button
              id="submit-attendance-calc-btn"
              type="button"
              onClick={triggerRollCalculator}
              disabled={isCalculating}
              className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs select-none cursor-pointer flex items-center justify-center gap-2.5 transition-all duration-150 ${
                isCalculating
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : isSelectedDateSubmitted
                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-150 active:scale-[0.98]'
              }`}
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Computing weights... {calcProgress}%</span>
                </>
              ) : isSelectedDateSubmitted ? (
                <>
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>Re-compile Ledger & Metrics</span>
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4 shrink-0" />
                  <span>Complete & Submit Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Calculation Progress Screen */}
        <AnimatePresence>
          {isCalculating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border border-indigo-100 bg-indigo-50/20 rounded-xl p-4.5 space-y-3"
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  <span className="font-display">{calcStepText}</span>
                </span>
                <span className="font-mono font-extrabold text-indigo-700">{calcProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${calcProgress}%` }}
                  className="h-full bg-indigo-600 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {calculationComplete && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: 10 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-start gap-3"
            >
              <div className="p-1 bg-emerald-500 text-white rounded-lg shrink-0 mt-0.5">
                <CheckCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-emerald-800 font-display">Ledger Synchronized Successfully!</h4>
                <p className="text-[10px] text-emerald-600 font-semibold leading-normal">
                  Official roll registers are calculated and saved. All individual student averages, trajectory trends, and class percentiles are now visually updated.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
