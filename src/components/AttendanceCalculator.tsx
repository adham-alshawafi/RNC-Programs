import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, AlertTriangle, Percent, ArrowUpDown, Flame, TrendingUp, Users, Download, Calendar, RefreshCw, SlidersHorizontal, ArrowRight, Activity, ArrowUpRight, ArrowDownRight, Sparkles, CheckCheck, Loader2, RotateCcw, X, FileSpreadsheet, LogOut, Check, BookOpen } from 'lucide-react';
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
import { initAuth, googleSignIn, logout } from '../lib/firebaseAuth';
import { User } from 'firebase/auth';

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
  onSelectSectionId?: (sectionId: string) => void;
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
  onSelectSectionId,
}: AttendanceCalculatorProps) {
  const [sortField, setSortField] = useState<'name' | 'percentage'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Local Google Sheets States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isExportingSheets, setIsExportingSheets] = useState<boolean>(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConnectSheets = async () => {
    try {
      setSheetsError(null);
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
      }
    } catch (err: any) {
      setSheetsError(err.message || 'Failed to authenticate Google Sheets scope');
    }
  };

  const handleDisconnectSheets = async () => {
    await logout();
    setGoogleUser(null);
    setGoogleToken(null);
    setExportedSheetUrl(null);
    setSheetsError(null);
  };

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

  // Class Section Dropdown Filter state
  const [classDropdownFilter, setClassDropdownFilter] = useState<string>('active');

  useEffect(() => {
    setClassDropdownFilter(activeSection.id);
  }, [activeSection.id]);

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

  // Helper to find dates in current week containing dateToUse
  const getWeekDates = (baseDateStr: string): string[] => {
    try {
      const d = new Date(baseDateStr + 'T00:00:00');
      const day = d.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);
      
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const nextD = new Date(monday);
        nextD.setDate(monday.getDate() + i);
        const yyyy = nextD.getFullYear();
        const mm = String(nextD.getMonth() + 1).padStart(2, '0');
        const dd = String(nextD.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }
      return dates;
    } catch (e) {
      return [baseDateStr];
    }
  };

  const currentWeekDates = getWeekDates(dateToUse);
  const currentMonthPrefix = dateToUse.substring(0, 7); // e.g. "2026-06"

  // Compile calculations for each student in the active section
  const studentCalculations = sectionStudents.map(student => {
    let presentCount = 0;
    let absentCount = 0;
    let withdrawnCount = 0;

    let weekPresent = 0;
    let weekTotal = 0;

    let monthPresent = 0;
    let monthTotal = 0;

    filteredSubmittedDates.forEach(date => {
      const records = attendance[date] || {};
      const status = records[student.id];
      
      if (status === 'withdrawn' || (student.isWithdrawn && !status)) {
        withdrawnCount++;
        return;
      }

      const isPresent = status === 'present';
      
      if (isPresent) {
        presentCount++;
      } else {
        absentCount++;
      }

      // Week calculation
      if (currentWeekDates.includes(date)) {
        weekTotal++;
        if (isPresent) weekPresent++;
      }

      // Month calculation
      if (date.startsWith(currentMonthPrefix)) {
        monthTotal++;
        if (isPresent) monthPresent++;
      }
    });

    const studentTrackedDays = filteredSubmittedDates.length - withdrawnCount;

    const attendancePercentage = studentTrackedDays > 0 
      ? Math.round((presentCount / studentTrackedDays) * 100) 
      : 100;

    const weekPercentage = weekTotal > 0
      ? Math.round((weekPresent / weekTotal) * 100)
      : null;

    const monthPercentage = monthTotal > 0
      ? Math.round((monthPresent / monthTotal) * 100)
      : null;

    return {
      student,
      presentCount,
      absentCount,
      percentage: attendancePercentage,
      weekPercentage,
      monthPercentage,
      weekPresent,
      weekTotal,
      monthPresent,
      monthTotal,
    };
  });

  // Group student calculations by Intake
  const intakeGroups = Array.from(
    new Set(sectionStudents.map(s => s.intake || 'Default Intake'))
  ).map(intakeName => {
    const cohortStudents = studentCalculations.filter(c => (c.student.intake || 'Default Intake') === intakeName);
    const studentCount = cohortStudents.length;
    
    // Average percentage for this cohort (using cumulative)
    const avgPercentage = studentCount > 0
      ? Math.round(cohortStudents.reduce((sum, item) => sum + item.percentage, 0) / studentCount)
      : 100;

    const avgWeekPercentage = studentCount > 0
      ? (() => {
          const items = cohortStudents.map(c => c.weekPercentage).filter((p): p is number => p !== null);
          return items.length > 0 ? Math.round(items.reduce((sum, p) => sum + p, 0) / items.length) : null;
        })()
      : null;

    const avgMonthPercentage = studentCount > 0
      ? (() => {
          const items = cohortStudents.map(c => c.monthPercentage).filter((p): p is number => p !== null);
          return items.length > 0 ? Math.round(items.reduce((sum, p) => sum + p, 0) / items.length) : null;
        })()
      : null;

    return {
      name: intakeName,
      studentCount,
      avgPercentage,
      avgWeekPercentage,
      avgMonthPercentage,
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

  // Resolve audit students list and perform detailed attendance mapping
  const auditStudents = (() => {
    if (classDropdownFilter === 'active') {
      return students.filter(s => s.sectionId === activeSection.id);
    }
    if (classDropdownFilter === 'all') {
      return students;
    }
    return students.filter(s => s.sectionId === classDropdownFilter);
  })();

  const auditCalculations = auditStudents.map(student => {
    const studentSectionDates = submittedDates[student.sectionId] || [];
    const studentSectionHolidays = holidays[student.sectionId] || [];
    
    const studentFilteredDates = studentSectionDates.filter(date => {
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      if (studentSectionHolidays.includes(date)) return false;
      return true;
    });

    let presentCount = 0;
    let absentCount = 0;
    let withdrawnCount = 0;

    let weekPresent = 0;
    let weekTotal = 0;

    let monthPresent = 0;
    let monthTotal = 0;

    studentFilteredDates.forEach(date => {
      const records = attendance[date] || {};
      const status = records[student.id];
      
      if (status === 'withdrawn' || (student.isWithdrawn && !status)) {
        withdrawnCount++;
        return;
      }

      const isPresent = status === 'present';
      
      if (isPresent) {
        presentCount++;
      } else {
        absentCount++;
      }

      if (currentWeekDates.includes(date)) {
        weekTotal++;
        if (isPresent) weekPresent++;
      }

      if (date.startsWith(currentMonthPrefix)) {
        monthTotal++;
        if (isPresent) monthPresent++;
      }
    });

    const studentTrackedDays = studentFilteredDates.length - withdrawnCount;

    const attendancePercentage = studentTrackedDays > 0 
      ? Math.round((presentCount / studentTrackedDays) * 100) 
      : 100;

    const weekPercentage = weekTotal > 0
      ? Math.round((weekPresent / weekTotal) * 100)
      : null;

    const monthPercentage = monthTotal > 0
      ? Math.round((monthPresent / monthTotal) * 100)
      : null;

    return {
      student,
      presentCount,
      absentCount,
      percentage: attendancePercentage,
      weekPercentage,
      monthPercentage,
      weekPresent,
      weekTotal,
      monthPresent,
      monthTotal,
      trackedDaysCount: studentTrackedDays,
    };
  });

  const auditHasTrackedDays = (() => {
    if (classDropdownFilter === 'all') {
      return Object.values(submittedDates).some(dates => dates.length > 0);
    }
    if (classDropdownFilter === 'active') {
      return sectionSubmittedDates.length > 0;
    }
    return (submittedDates[classDropdownFilter] || []).length > 0;
  })();

  // Export active section attendance stats to CSV
  const handleExportCSV = () => {
    const auditSectionName = (() => {
      if (classDropdownFilter === 'active') return activeSection.name;
      if (classDropdownFilter === 'all') return 'All Classes';
      return sections.find(s => s.id === classDropdownFilter)?.name || 'Audited Class';
    })();

    const headers = [
      'Student ID',
      'Student Name',
      'Section Name',
      'Total Academic Days',
      'Days Present',
      'Days Absent',
      'Attendance Rate'
    ];

    const rows = sortedCalculations.map(({ student, presentCount, absentCount, percentage, trackedDaysCount }) => [
      student.id,
      student.name,
      sections.find(s => s.id === student.sectionId)?.name || 'Default',
      trackedDaysCount,
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
    link.download = `${auditSectionName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}_attendance_report.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportToGoogleSheets = async () => {
    if (!googleToken) {
      await handleConnectSheets();
      return;
    }

    const auditSectionName = (() => {
      if (classDropdownFilter === 'active') return activeSection.name;
      if (classDropdownFilter === 'all') return 'All Classes';
      return sections.find(s => s.id === classDropdownFilter)?.name || 'Audited Class';
    })();

    const confirmed = window.confirm(
      `Export ${sortedCalculations.length} students' attendance stats from "${auditSectionName}" to Google Sheets?`
    );
    if (!confirmed) return;

    setIsExportingSheets(true);
    setSheetsError(null);
    setExportedSheetUrl(null);

    const headers = [
      'Student ID',
      'Student Name',
      'Intake Period',
      'Section Name',
      'Total Academic Days',
      'Days Present',
      'Days Absent',
      'Weekly Attendance Rate',
      'Monthly Attendance Rate',
      'Overall Attendance Rate'
    ];

    const rows = sortedCalculations.map(({ student, presentCount, absentCount, percentage, weekPercentage, monthPercentage, trackedDaysCount }) => [
      student.id,
      student.name,
      student.intake || 'Default Intake',
      sections.find(s => s.id === student.sectionId)?.name || 'Default',
      trackedDaysCount,
      presentCount,
      absentCount,
      weekPercentage !== null ? `${weekPercentage}%` : '—',
      monthPercentage !== null ? `${monthPercentage}%` : '—',
      `${percentage}%`
    ]);

    try {
      // 1. Create Spreadsheet
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `${auditSectionName} - Attendance Report (${new Date().toLocaleDateString()})`
          }
        })
      });

      if (createResponse.status === 401) {
        // Token expired
        setGoogleToken(null);
        throw new Error('Your Google session has expired. Please authenticate again to export.');
      }

      if (!createResponse.ok) {
        const errorBody = await createResponse.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `Spreadsheet creation failed with status ${createResponse.status}`);
      }

      const sheetInfo = await createResponse.json();
      const spreadsheetId = sheetInfo.spreadsheetId;
      const spreadsheetUrl = sheetInfo.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // 2. Put values on Sheet1
      const populateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [
            headers,
            ...rows
          ]
        })
      });

      if (!populateResponse.ok) {
        const errorBody = await populateResponse.json().catch(() => ({}));
        if (populateResponse.status === 401) {
          setGoogleToken(null);
        }
        throw new Error(errorBody.error?.message || `Failed to populate spreadsheet data (${populateResponse.status})`);
      }

      setExportedSheetUrl(spreadsheetUrl);
    } catch (err: any) {
      console.error('Workspace Google Sheets integration error:', err);
      setSheetsError(err.message || 'Failed to export report to Google Sheets.');
    } finally {
      setIsExportingSheets(false);
    }
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

  const filteredCalculations = auditCalculations.filter(item => {
    if (attendanceStatusFilter === 'all') return true;
    if (attendanceStatusFilter === 'at_risk') return item.percentage < 75 && item.trackedDaysCount > 0;
    if (attendanceStatusFilter === 'perfect') return item.percentage === 100 && item.trackedDaysCount > 0;
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

      {/* Active Intakes Cohort Directory Section */}
      <div id="intake-cohorts-summary-box" className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-display">Active Intakes Cohort Directory</h4>
            <p className="text-[10px] text-slate-400 font-medium">Headcounts and rolling average attendance grouped by class intake period</p>
          </div>
        </div>

        {intakeGroups.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl">
            No student cohorts or intakes registered. Specify intakes in Student Directory.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {intakeGroups.map((grp) => {
              const hasMonth = grp.avgMonthPercentage !== null;
              const hasWeek = grp.avgWeekPercentage !== null;
              return (
                <div 
                  key={grp.name} 
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150/60 hover:border-slate-300 rounded-xl p-4 space-y-3.5 transition-all duration-200 shadow-2xs relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Intake Period</span>
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[130px] block mt-0.5" title={grp.name}>{grp.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[9px] font-black shrink-0">
                      {grp.studentCount} {grp.studentCount === 1 ? 'std' : 'stds'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 divide-x divide-slate-100 bg-white p-2 rounded-lg border border-slate-100">
                    <div className="text-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block">Weekly</span>
                      <span className="font-mono text-[10px] font-black text-slate-700 block mt-0.5">
                        {hasWeek ? `${grp.avgWeekPercentage}%` : '—'}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block">Monthly</span>
                      <span className="font-mono text-[10px] font-black text-slate-700 block mt-0.5">
                        {hasMonth ? `${grp.avgMonthPercentage}%` : '—'}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block">Overall</span>
                      <span className="font-mono text-[10px] font-black text-indigo-600 block mt-0.5">
                        {grp.avgPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50/70 px-2.5 py-1.5 rounded-xl select-none">
              <Users className="w-3.5 h-3.5" />
              <span>{totalStudents} Students</span>
            </div>
            {totalStudents > 0 && (
              <>
                {/* Standard CSV Exporter */}
                <button
                  id="export-csv-btn"
                  onClick={handleExportCSV}
                  className="text-xs font-bold text-slate-705 bg-white hover:bg-slate-50 border border-slate-205 hover:border-slate-300 active:scale-[0.99] transition-all duration-150 flex items-center gap-1.5 px-3.5 py-2 rounded-xl shadow-2xs cursor-pointer select-none"
                  title="Download standard CSV report"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>CSV</span>
                </button>

                {/* Google Sheets Sync integration */}
                {!googleUser ? (
                  <button
                    id="connect-sheets-btn"
                    type="button"
                    onClick={handleConnectSheets}
                    className="text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/50 active:scale-[0.99] transition-all duration-150 flex items-center gap-1.5 px-3.5 py-2 rounded-xl cursor-pointer"
                    title="Connect Google Sheets to export live spreadsheets"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Connect Sheets</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-emerald-50/40 border border-emerald-100/50 p-1 rounded-xl">
                    <button
                      id="export-sheets-btn"
                      type="button"
                      onClick={handleExportToGoogleSheets}
                      disabled={isExportingSheets}
                      className="text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all duration-150 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg disabled:opacity-70 cursor-pointer"
                      title="Export this report direct to Google Sheets"
                    >
                      {isExportingSheets ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      )}
                      <span>{isExportingSheets ? 'Exporting...' : 'Export Sheets'}</span>
                    </button>
                    
                    {/* Google profile widget / log out option */}
                    <div className="flex items-center gap-1.5 pr-2 pl-1 select-none" title={`Connected as ${googleUser.email}`}>
                      {googleUser.photoURL ? (
                        <img 
                          src={googleUser.photoURL} 
                          alt="Google Profile" 
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full border border-emerald-200 shadow-3xs hover:border-emerald-400 transition-colors"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[9px] flex items-center justify-center">
                          {googleUser.email?.substring(0, 1).toUpperCase()}
                        </span>
                      )}
                      <button 
                        type="button"
                        onClick={handleDisconnectSheets} 
                        className="text-slate-400 hover:text-rose-600 transition p-0.5 rounded cursor-pointer"
                        title="Disconnect Google account"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Class Section Click-Point Filter */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-linear-to-r from-slate-50/20 via-slate-50/10 to-transparent">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-[10px] font-black text-indigo-750 uppercase tracking-widest bg-indigo-50 border border-indigo-150/35 px-2.5 py-1 rounded-full w-fit flex items-center gap-1 select-none">
                <BookOpen className="w-3 h-3 text-indigo-500 animate-pulse" />
                <span>English Classes Directory</span>
              </span>
              <p className="text-[10px] text-slate-400 font-bold sm:text-right">Click class pill to instantly select and audit student averages</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {sections.map(sec => {
                const isActive = sec.id === activeSection.id;
                const count = students.filter(s => s.sectionId === sec.id).length;
                
                // Let's identify the group style/color based on section name
                const isEnglishProg = sec.programId === 'prog-english';
                
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      if (onSelectSectionId) {
                        onSelectSectionId(sec.id);
                      }
                    }}
                    className={`text-xs font-bold px-3.5 py-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all duration-150 relative overflow-hidden select-none active:scale-[0.98] ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100 font-black'
                        : isEnglishProg
                        ? 'bg-white hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-200 text-slate-650 hover:text-indigo-850'
                        : 'bg-white hover:bg-emerald-50/30 border-slate-200/90 hover:border-emerald-200 text-slate-650 hover:text-emerald-850'
                    }`}
                  >
                    {isActive ? (
                      <Check className="w-3.5 h-3.5 text-white shrink-0" />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isEnglishProg ? 'bg-indigo-500/70' : 'bg-emerald-500/70'
                      }`} />
                    )}
                    <span>{sec.name}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full transition-colors ${
                      isActive 
                        ? 'bg-indigo-750 text-indigo-100' 
                        : isEnglishProg
                        ? 'bg-indigo-50/50 text-indigo-700'
                        : 'bg-emerald-50/50 text-emerald-700'
                    }`}>
                      {count} {count === 1 ? 'std' : 'stds'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Google Sheets Alerts */}
        <AnimatePresence>
          {exportedSheetUrl && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-3.5 bg-emerald-50/90 border-b border-emerald-200/60 text-emerald-800 flex items-center justify-between gap-4 text-xs font-bold animate-fade-in"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 animate-bounce">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900">Attendance Report Exported!</p>
                  <p className="text-[10px] text-emerald-600 font-medium font-sans">A live spreadsheet was successfully assembled in your Google Drive.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a 
                  href={exportedSheetUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] transition-all text-white font-extrabold text-[11px] rounded-lg shadow-sm shadow-emerald-100 inline-flex items-center gap-1"
                >
                  <span>Open Spreadsheet</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <button 
                  type="button"
                  onClick={() => setExportedSheetUrl(null)} 
                  className="p-1 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 rounded-lg transition cursor-pointer"
                  title="Dismiss alert"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {sheetsError && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-3.5 bg-rose-50 border-b border-rose-200 text-rose-800 flex items-center justify-between gap-4 text-xs font-bold animate-fade-in"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-100 text-rose-800 rounded-lg shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-rose-900 font-sans">Spreadsheet Export Failed</p>
                  <p className="text-[10px] text-rose-500 font-medium">{sheetsError}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSheetsError(null)} 
                className="p-1 bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded-lg transition cursor-pointer shrink-0"
                title="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dropdown Filter above the student table */}
        {students.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
              {/* Class Level Dropdown Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-505" />
                  <span>Class Level:</span>
                </span>
                <div className="relative w-full sm:w-48">
                  <select
                    id="class-proficiency-level-dropdown"
                    value={classDropdownFilter}
                    onChange={(e) => {
                      setClassDropdownFilter(e.target.value);
                      setAttendanceStatusFilter('all');
                    }}
                    className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer transition focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 shadow-2xs"
                  >
                    <option value="active">Active: {activeSection.name}</option>
                    <option value="all">All Classes Combined ({students.length})</option>
                    {sections.map(sec => {
                      const count = students.filter(s => s.sectionId === sec.id).length;
                      return (
                        <option key={sec.id} value={sec.id}>
                          {sec.name} ({count} {count === 1 ? 'std' : 'stds'})
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Performance Dropdown Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Performance:</span>
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-44">
                    <select
                      id="attendance-status-filter-dropdown"
                      value={attendanceStatusFilter}
                      onChange={(e) => setAttendanceStatusFilter(e.target.value as any)}
                      className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-705 text-xs font-bold rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer transition focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 shadow-2xs"
                    >
                      <option value="all">All Students ({auditStudents.length})</option>
                      <option value="at_risk">At-Risk Cases (Below 75%)</option>
                      <option value="perfect">Perfect Records (100%)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                      <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>

                  {(attendanceStatusFilter !== 'all' || classDropdownFilter !== 'active') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttendanceStatusFilter('all');
                        setClassDropdownFilter('active');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 rounded-xl transition duration-150 text-xs font-bold shrink-0 cursor-pointer active:scale-95 border border-indigo-100/50"
                      title="Clear performance and level filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400 font-bold self-end md:self-auto">
              <span>Showing:</span>
              <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                {filteredCalculations.length} / {auditStudents.length} students
              </span>
            </div>
          </div>
        )}

        {auditStudents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No student records registered under this proficiency class. Add students under Student Settings.
          </div>
        ) : !auditHasTrackedDays ? (
          <div className="py-12 text-center text-slate-401 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/10 min-h-[220px]">
            <SlidersHorizontal className="w-8 h-8 text-indigo-400/80 animate-pulse" />
            <p className="font-semibold text-slate-600">No attendance records found for this class level.</p>
            <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
              No roll-call lists were submitted or finalized for this class level. Submit a roll sheet or change class levels to audit.
            </p>
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
                  sortedCalculations.map(({ student, presentCount, absentCount, percentage, weekPercentage, monthPercentage, trackedDaysCount }) => {
                    const isWarning = percentage < 75 && trackedDaysCount > 0;
                    const isGold = percentage === 100 && trackedDaysCount > 0;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/30 transition">
                        {/* Name with tag folders */}
                        <td className="pl-6 pr-4 py-3.5 align-middle">
                          <div className="flex flex-col gap-1 min-w-[220px]">
                            <div className="flex items-center gap-2">
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

                            {/* Weekly, Monthly, and Intake percentage folders */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 select-none">
                              <span className="px-1.5 py-0.5 rounded bg-amber-50/80 text-amber-800 border border-amber-200/40 text-[9px] font-extrabold flex items-center gap-1" title="Attendance this week (Monday to Sunday week window)">
                                <span>Week:</span>
                                <span className="font-mono">{weekPercentage !== null ? `${weekPercentage}%` : '—'}</span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50/80 text-emerald-800 border border-emerald-200/40 text-[9px] font-extrabold flex items-center gap-1" title="Attendance this calendar month">
                                <span>Month:</span>
                                <span className="font-mono">{monthPercentage !== null ? `${monthPercentage}%` : '—'}</span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50/80 text-indigo-850 border border-indigo-200/40 text-[9px] font-extrabold flex items-center gap-1" title={`Intake average for: ${student.intake || 'Default Intake'}`}>
                                <span>Intake ({student.intake || 'Default'}):</span>
                                <span className="font-mono">
                                  {(() => {
                                    const grp = intakeGroups.find(g => g.name === (student.intake || 'Default Intake'));
                                    return grp ? `${grp.avgPercentage}%` : '—';
                                  })()}
                                </span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Attended Count */}
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-500">
                          <span className="text-emerald-600">{presentCount}</span> / {trackedDaysCount}
                        </td>

                        {/* Absent Count */}
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-500">
                          <span className="text-rose-500">{absentCount}</span> / {trackedDaysCount}
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
