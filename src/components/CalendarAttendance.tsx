import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Calendar as CalendarIcon, UserCheck, AlertCircle, MessageSquare, FileText, Coffee } from 'lucide-react';
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
}: CalendarAttendanceProps) {
  // Calendar internal tracking (viewing month/year)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // 0-indexed, May in 2026 matches system logs (2026-05)

  // Note editing state variables
  const [editingNoteStudentId, setEditingNoteStudentId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Clear editing states if group or day transitions
  useEffect(() => {
    setEditingNoteStudentId(null);
    setNoteText('');
  }, [activeSection.id, selectedDate]);

  const sectionStudents = students.filter(std => std.sectionId === activeSection.id);
  const sectionMarkedDates = markedDates[activeSection.id] || [];
  const sectionSubmittedDates = submittedDates[activeSection.id] || [];
  const sectionHolidays = holidays[activeSection.id] || [];
  const isHolidayActiveDate = sectionHolidays.includes(selectedDate);

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
  const calendarCells: { dateString: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const paddingDay = prevMonthDays - i;
    calendarCells.push({
      dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(paddingDay).padStart(2, '0')}`,
      dayNum: paddingDay,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  // Next month padding (to complete 6 rows / 42 cells)
  const remainingCells = 42 - calendarCells.length;
  for (let n = 1; n <= remainingCells; n++) {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarCells.push({
      dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`,
      dayNum: n,
      isCurrentMonth: false,
    });
  }

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

  return (
    <div id="calendar-attendance-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT: Monthly Calendar Grid Component */}
      <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 font-display">Select Date</h4>
              <p className="text-xs text-slate-400 font-medium">Click a day to log attendance</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-1 hover:bg-white hover:shadow-xs text-slate-600 rounded-lg transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 min-w-[100px] text-center font-display">
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-1 hover:bg-white hover:shadow-xs text-slate-600 rounded-lg transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday indicators */}
          <div className="grid grid-cols-7 text-center mb-2">
            {DAYS_OF_WEEK.map(day => (
              <span key={day} className="text-xxs font-bold text-slate-400 uppercase tracking-wider py-1.5">
                {day}
              </span>
            ))}
          </div>

          {/* Calendar grid cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const isSelected = cell.dateString === selectedDate;
              const hasMarked = sectionMarkedDates.includes(cell.dateString);
              const isHoliday = sectionHolidays.includes(cell.dateString);
              
              // Check if selected date cell is today
              const todayStr = new Date().toISOString().split('T')[0];
              const isToday = cell.dateString === todayStr;

              return (
                <button
                  key={`${cell.dateString}-${idx}`}
                  onClick={() => {
                    onSelectDate(cell.dateString);
                    // Update main month/year view tracker if they click padding dates
                    const [y, m] = cell.dateString.split('-');
                    setCurrentYear(Number(y));
                    setCurrentMonth(Number(m) - 1);
                  }}
                  className={`relative p-2.5 rounded-lg text-xs font-semibold transition-all aspect-square flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : !cell.isCurrentMonth
                      ? 'text-slate-300 hover:bg-slate-50'
                      : isToday
                      ? 'bg-amber-50/50 border border-amber-200 text-amber-800 hover:bg-amber-100 hover:text-amber-900'
                      : isHoliday
                      ? 'bg-amber-50/30 border border-amber-200/50 text-amber-700 hover:bg-amber-100/55'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{cell.dayNum}</span>
                  
                  {isHoliday && (
                    <Coffee className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 ${
                      isSelected ? 'text-indigo-200' : 'text-amber-500 animate-pulse'
                    }`} />
                  )}

                  {/* Mark Indicator (subtle dot) */}
                  {hasMarked && (
                    <span className={`absolute bottom-1 w-1.2 h-1.2 rounded-full ${
                      sectionSubmittedDates.includes(cell.dateString)
                        ? (isSelected ? 'bg-emerald-300' : 'bg-emerald-500')
                        : (isSelected ? 'bg-amber-300' : 'bg-amber-500')
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-col gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider select-none">
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
      </div>

      {/* RIGHT: Roll Call Attendance Sheet */}
      <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
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
          <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-slate-50/20">
            {sectionStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <p className="text-xs text-slate-400">Please add students to this section to mark attendance.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sectionStudents.map((student) => {
                  const currentStatus = selectedDateAttendance[student.id];
                  const dateNotes = attendanceNotes[selectedDate] || {};
                  const studentNote = dateNotes[student.id] || '';
                  const isEditingNote = editingNoteStudentId === student.id;

                  return (
                    <div key={student.id} className="border-b last:border-b-0 border-slate-100/60 bg-white">
                      {/* Main Student Row */}
                      <div className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/30 transition-all">
                        {/* Name & Note indicator with tooltip decoration */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px] sm:max-w-xs">{student.name}</span>
                          {studentNote && (
                            <span
                              title={`Attendance note: ${studentNote}`}
                              className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[9px] font-bold truncate max-w-[180px] cursor-help flex items-center gap-1 shrink-0 select-none animate-fade-in"
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
                            className={`p-1.5 rounded-lg transition-all border shrink-0 ${
                              studentNote 
                                ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-150 border-indigo-200/50' 
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
                              className={`px-3 py-1 rounded-md text-xxs font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                                currentStatus === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden sm:inline">Present</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateAttendance(selectedDate, student.id, 'absent')}
                              className={`px-3 py-1 rounded-md text-xxs font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                                currentStatus === 'absent'
                                  ? 'bg-rose-500 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <X className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden sm:inline">Absent</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Collapsible Edit Note Tray */}
                      {isEditingNote && (
                        <div className="px-4 py-3.5 bg-slate-50 border-t border-b border-slate-100/80 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                              Attendance note for <strong className="text-slate-700 font-extrabold">"{student.name}"</strong>:
                            </span>
                            {studentNote && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateNote(selectedDate, student.id, '');
                                  setEditingNoteStudentId(null);
                                }}
                                className="text-[9px] font-extrabold text-rose-500 hover:text-rose-700 transition"
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
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
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
                ? 'bg-emerald-50/50 border-emerald-100/70 text-emerald-800' 
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

        {/* Sync Prompt Footer */}
        <div className="mt-5 border-t border-slate-50 pt-4 flex items-center justify-between text-xxs font-medium text-slate-400">
          <div className="flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
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
  );
}
