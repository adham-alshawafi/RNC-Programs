import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  SlidersHorizontal, 
  HelpCircle,
  Activity,
  ArrowRight,
  BookOpen,
  Search,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Download,
  Info,
  Layers,
  Flame,
  Check,
  Plus,
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from 'recharts';
import { Student, Section, AttendanceMap, AttendanceStatus } from '../types';

interface IntakeBoardProps {
  students: Student[];
  attendance: AttendanceMap;
  submittedDates: Record<string, string[]>;
  sections: Section[];
  holidays: Record<string, string[]>;
  customIntakes: string[];
  onAddIntake: (name: string) => void;
  onRenameIntake: (oldName: string, newName: string) => void;
  onDeleteIntake: (name: string) => void;
  canceledClasses: Record<string, Record<string, string>>;
  attendanceThreshold?: number;
}

export default function IntakeBoard({
  students,
  attendance,
  submittedDates,
  sections,
  holidays,
  customIntakes,
  onAddIntake,
  onRenameIntake,
  onDeleteIntake,
  canceledClasses,
  attendanceThreshold = 75,
}: IntakeBoardProps) {
  // Local UI States
  const [selectedCohort, setSelectedCohort] = useState<string>('all'); // specific intake or 'all'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<'name' | 'percentage'>('percentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Intake Manager States
  const [isIntakeManagerOpen, setIsIntakeManagerOpen] = useState(false);
  const [newCustomIntakeName, setNewCustomIntakeName] = useState('');
  const [editingIntakeOldName, setEditingIntakeOldName] = useState<string | null>(null);
  const [editingIntakeNewName, setEditingIntakeNewName] = useState('');

  // Find all unique intakes in the student database + custom predefined list
  const availableIntakes = useMemo(() => {
    const intakesSet = new Set<string>();
    customIntakes.forEach(it => intakesSet.add(it));
    students.forEach(s => {
      intakesSet.add(s.intake?.trim() || 'Default Intake');
    });
    return Array.from(intakesSet).sort();
  }, [students, customIntakes]);

  // Compute detailed calculations for EVERY student across their registered classes
  const studentFullCalculations = useMemo(() => {
    return students.map(student => {
      const studentHolidays = holidays[student.sectionId] || [];
      const studentCanceled = canceledClasses[student.sectionId] || {};
      const studentSectionDates = submittedDates[student.sectionId] || [];
      
      const studentFilteredDates = studentSectionDates.filter(date => {
        const isHoliday = studentHolidays.includes(date);
        const isCanceled = studentCanceled[date] !== undefined;
        return !isHoliday && !isCanceled;
      });
      const totalDaysCount = studentFilteredDates.length;

      let presentCount = 0;
      let absentCount = 0;

      studentFilteredDates.forEach(date => {
        const records = attendance[date] || {};
        const status = records[student.id];
        
        if (status === 'present') {
          presentCount++;
        } else {
          absentCount++;
        }
      });

      const percentage = totalDaysCount > 0 
        ? Math.round((presentCount / totalDaysCount) * 100) 
        : 100;

      return {
        student,
        presentCount,
        absentCount,
        percentage,
        trackedDaysCount: totalDaysCount,
        sectionName: sections.find(s => s.id === student.sectionId)?.name || 'Default Class',
      };
    });
  }, [students, attendance, submittedDates, sections, holidays, canceledClasses]);

  // Group calculations and aggregates by Intake Period Cohorts
  const intakeGroups = useMemo(() => {
    return availableIntakes.map(intakeName => {
      const cohortStudents = studentFullCalculations.filter(c => (c.student.intake || 'Default Intake') === intakeName);
      const studentCount = cohortStudents.length;

      // Filter to students that actually have tracked session days to compute true averages
      const auditedStudents = cohortStudents.filter(s => s.trackedDaysCount > 0);
      const avgPercentage = auditedStudents.length > 0
        ? Math.round(auditedStudents.reduce((acc, curr) => acc + curr.percentage, 0) / auditedStudents.length)
        : 100;

      // Extract perfect attenders and at risk cases
      const perfectCount = auditedStudents.filter(s => s.percentage === 100).length;
      const atRiskCount = auditedStudents.filter(s => s.percentage < attendanceThreshold).length;

      // Find star student in this intake
      const starStudent = cohortStudents.length > 0
        ? [...cohortStudents].sort((a, b) => b.percentage - a.percentage)[0]
        : null;

      // Determine class levels/sections represented
      const sectionsRepresented = Array.from(new Set(cohortStudents.map(s => s.sectionName)));

      return {
        name: intakeName,
        studentCount,
        avgPercentage,
        perfectCount,
        atRiskCount,
        starName: starStudent && starStudent.percentage > 0 ? starStudent.student.name : 'N/A',
        starPercentage: starStudent ? starStudent.percentage : null,
        sectionsCount: sectionsRepresented.length,
        classesList: sectionsRepresented.join(', '),
      };
    });
  }, [availableIntakes, studentFullCalculations]);

  // Overall statistics
  const aggregateStats = useMemo(() => {
    const count = students.length;
    const trackedCalcs = studentFullCalculations.filter(c => c.trackedDaysCount > 0);
    const overallAvg = trackedCalcs.length > 0
      ? Math.round(trackedCalcs.reduce((acc, curr) => acc + curr.percentage, 0) / trackedCalcs.length)
      : 100;

    return {
      count,
      overallAvg,
      totalIntakes: availableIntakes.length,
    };
  }, [students, studentFullCalculations, availableIntakes]);

  // Get student list for display according to filters & queries
  const displayStudentCalculations = useMemo(() => {
    return studentFullCalculations.filter(item => {
      // Cohort Filter
      if (selectedCohort !== 'all' && (item.student.intake || 'Default Intake') !== selectedCohort) {
        return false;
      }
      // Search Box Filter
      const matchesSearch = item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.student.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [studentFullCalculations, selectedCohort, searchQuery]);

  // Sort student calculations
  const sortedDisplayStudents = useMemo(() => {
    return [...displayStudentCalculations].sort((a, b) => {
      if (selectedSort === 'name') {
        const diff = a.student.name.localeCompare(b.student.name);
        return sortDirection === 'asc' ? diff : -diff;
      } else {
        const diff = a.percentage - b.percentage;
        return sortDirection === 'asc' ? diff : -diff;
      }
    });
  }, [displayStudentCalculations, selectedSort, sortDirection]);

  // Recharts Chart Data
  const chartData = useMemo(() => {
    return intakeGroups.map(grp => ({
      name: grp.name,
      'Average Attendance %': grp.avgPercentage,
      'Students Enrolled': grp.studentCount,
    }));
  }, [intakeGroups]);

  return (
    <div className="space-y-6 select-none">
      
      {/* Title block */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-indigo-500" />
            <span>Class Intake Cohort Board</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            Inspect, filter, and review class attendance structures categorized by original intake enrollment cohorts.
          </p>
        </div>

        <div className="flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => setIsIntakeManagerOpen(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xxs font-black uppercase tracking-wider border flex items-center gap-1.5 transition-all duration-150 cursor-pointer select-none active:scale-95 ${
              isIntakeManagerOpen
                ? 'bg-indigo-650 border-indigo-605 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-205 text-indigo-700 hover:text-indigo-850'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Manage Intakes list</span>
          </button>

          <div className="text-xxs px-3 py-1.5 bg-indigo-50/50 rounded-xl text-indigo-700 font-extrabold border border-indigo-100/30">
            Tracking {aggregateStats.totalIntakes} Active Intakes Combined
          </div>
        </div>
      </div>

      {/* Intake Management Drawer */}
      <AnimatePresence>
        {isIntakeManagerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border border-slate-150 rounded-2xl bg-linear-to-b from-indigo-50/20 via-indigo-50/5 to-transparent select-none p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 animate-fade-in">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Configure Student Intake Cohorts</span>
                </h4>
                <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed font-semibold">
                  Update intake terms globally. Adding an intake registers the tag so students can be sorted into it. Renaming or deleting updates student records dynamically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsIntakeManagerOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create Intake Panel */}
            <div className="p-3 bg-white border border-slate-150 rounded-xl flex flex-col sm:flex-row items-center gap-2">
              <div className="text-xs font-bold text-slate-600 shrink-0">Define New Intake:</div>
              <input
                type="text"
                placeholder="e.g. May 2026"
                value={newCustomIntakeName}
                onChange={e => setNewCustomIntakeName(e.target.value)}
                className="flex-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-205 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 text-slate-850"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newCustomIntakeName.trim()) {
                      onAddIntake(newCustomIntakeName.trim());
                      setNewCustomIntakeName('');
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newCustomIntakeName.trim()) {
                    onAddIntake(newCustomIntakeName.trim());
                    setNewCustomIntakeName('');
                  }
                }}
                disabled={!newCustomIntakeName.trim()}
                className="w-full sm:w-auto px-4 py-1.5 bg-indigo-650 hover:bg-indigo-750 disabled:opacity-50 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer transition select-none"
              >
                + Register
              </button>
            </div>

            {/* List and Modify Intakes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableIntakes.map(intake => {
                const studentCount = students.filter(s => (s.intake || 'Default Intake') === intake).length;
                const isDefault = intake === 'Default Intake';
                const isEditingThis = editingIntakeOldName === intake;

                return (
                  <div key={intake} className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between gap-3 shadow-3xs">
                    {isEditingThis ? (
                      <div className="flex-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingIntakeNewName}
                          onChange={e => setEditingIntakeNewName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-slate-50 border border-indigo-400 rounded-lg text-xs font-semibold text-slate-800"
                          placeholder="New name"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              onRenameIntake(intake, editingIntakeNewName);
                              setEditingIntakeOldName(null);
                            }
                            if (e.key === 'Escape') setEditingIntakeOldName(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onRenameIntake(intake, editingIntakeNewName);
                            setEditingIntakeOldName(null);
                          }}
                          className="p-1 text-emerald-600 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIntakeOldName(null)}
                          className="p-1 text-slate-450 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex flex-col">
                          <span className="text-xs font-black text-slate-705 truncate underline decoration-indigo-400/40 decoration-wavy" title={intake}>
                            {intake}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            {studentCount} student{studentCount === 1 ? '' : 's'} assigned
                          </span>
                        </div>

                        {!isDefault && (
                          <div className="shrink-0 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIntakeOldName(intake);
                                setEditingIntakeNewName(intake);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50/50 rounded transition cursor-pointer"
                              title="Rename Course"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove the intake "${intake}"? All assigned students will revert to "Default Intake".`)) {
                                  onDeleteIntake(intake);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded transition cursor-pointer"
                              title="Delete Course"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cohort Comparative Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left column: Overview Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span>Intake Performance Comparison</span>
            </h4>
            <p className="text-[10px] text-slate-450 font-semibold">Side-by-side statistics comparing rolling average percentages and student count volumes</p>
          </div>

          <div className="h-[220px] w-full text-xxs font-mono">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                No cohort logs computed. Specify student intakes.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    fontWeight={700}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    fontWeight={700}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', borderColor: '#f1f5f9', fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={6} />
                  <Bar dataKey="Average Attendance %" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={25}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry['Average Attendance %'] < attendanceThreshold ? '#f43f5e' : '#4f46e5'} />
                    ))}
                  </Bar>
                  <Bar dataKey="Students Enrolled" fill="#a5b4fc" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right column: High-Level aggregate scorecard */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-display">General Performance Status</h4>
            <p className="text-[10px] text-slate-400 font-semibold">Quick audit feedback metrics of enrollment records</p>
          </div>

          <div className="space-y-3.5 pt-2">
            
            {/* Average Presence */}
            <div className="p-3 bg-linear-to-r from-indigo-50/40 via-indigo-50/10 to-transparent border border-indigo-150/30 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-indigo-700 font-bold block uppercase tracking-wider">Overall Ratio</span>
                <span className="text-xs font-semibold text-slate-500 block leading-tight">Average rate across all cohorts</span>
              </div>
              <h4 className="text-2xl font-black text-indigo-700 font-display shrink-0">{aggregateStats.overallAvg}%</h4>
            </div>

            {/* Total Student Registry */}
            <div className="p-3 bg-slate-50/55 border border-slate-150/30 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-650 font-bold block uppercase tracking-wider">Cohort Enrollment</span>
                <span className="text-xs font-semibold text-slate-500 block leading-tight">Total students on file</span>
              </div>
              <h4 className="text-2xl font-black text-slate-700 font-display shrink-0">{aggregateStats.count}</h4>
            </div>

            {/* At-Risk Alert Summary */}
            <div className="p-3 bg-rose-50/40 border border-rose-150/20 rounded-xl flex items-center justify-between text-rose-800">
              <div className="space-y-0.5">
                <span className="text-[10px] text-rose-700 font-bold block uppercase tracking-wider">Total At-Risk Students</span>
                <span className="text-xs font-semibold text-rose-650/80 block leading-tight">Attendance rates under {attendanceThreshold}%</span>
              </div>
              <h4 className="text-2xl font-black text-rose-600 font-display shrink-0">
                {studentFullCalculations.filter(c => c.percentage < attendanceThreshold && c.trackedDaysCount > 0).length}
              </h4>
            </div>

          </div>
        </div>

      </div>

      {/* Intake Class Cards Bento row */}
      <div className="space-y-3">
        <span className="text-xxs font-black text-slate-450 uppercase tracking-widest block font-bold">Auditing Cohorts Details Map</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card for specifying ALL intakers */}
          <div 
            onClick={() => setSelectedCohort('all')}
            className={`rounded-2xl p-4 border transition duration-150 cursor-pointer text-left flex flex-col justify-between gap-5 select-none ${
              selectedCohort === 'all'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                : 'bg-white border-slate-150 hover:border-indigo-250 hover:bg-slate-50/30 text-slate-800 hover:shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                  selectedCohort === 'all' ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-50 text-indigo-700'
                }`}>Cohort Filter</span>
                <h4 className="text-sm font-black font-display mt-1.5">All Combined Groups</h4>
                <p className={`text-[10px] leading-relaxed font-semibold ${
                  selectedCohort === 'all' ? 'text-indigo-150' : 'text-slate-400'
                }`}>
                  Complete enrollment roster including all original intake dates
                </p>
              </div>
              <Users className={`w-5 h-5 shrink-0 ${
                selectedCohort === 'all' ? 'text-indigo-200' : 'text-indigo-500'
              }`} />
            </div>

            <div className="flex items-center justify-between text-xs font-mono border-t pt-3 select-none border-indigo-500/25">
              <span>{students.length} Student{students.length === 1 ? '' : 's'}</span>
              <span className="font-extrabold">{aggregateStats.overallAvg}% Combined</span>
            </div>
          </div>

          {/* Iterate on specific intake groups */}
          {intakeGroups.map((group) => {
            const isSelected = selectedCohort === group.name;
            const hasWarning = group.avgPercentage < attendanceThreshold;

            return (
              <div
                key={group.name}
                onClick={() => setSelectedCohort(group.name)}
                className={`rounded-2xl p-4 border transition duration-150 cursor-pointer text-left flex flex-col justify-between gap-4 select-none ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                    : 'bg-white border-slate-150 hover:border-indigo-250 hover:bg-slate-50/30 text-slate-800 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                    }`}>Cohort Intake</span>
                    
                    <h4 className="text-sm font-black font-display font-display truncate mt-1.5" title={group.name}>
                      {group.name}
                    </h4>
                    
                    <span 
                      className={`text-[9px] font-semibold truncate block max-w-[170px] ${
                        isSelected ? 'text-indigo-150' : 'text-slate-400'
                      }`} 
                      title={group.classesList}
                    >
                      Classes: <strong className="font-bold">{group.classesList || 'None'}</strong>
                    </span>
                  </div>

                  <div className={`p-2 rounded-xl shrink-0 ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    <Award className="w-4 h-4" />
                  </div>
                </div>

                {/* Sub statistics footer */}
                <div className={`flex flex-col gap-1.5 border-t pt-3 font-semibold text-[10px] ${
                  isSelected ? 'border-indigo-500/20 text-indigo-100' : 'border-slate-100 text-slate-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <span>Attendance Rate:</span>
                    <strong className="font-mono text-xs">{group.avgPercentage}%</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Headcount Limit:</span>
                    <strong>{group.studentCount} Students</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Risk cases (Rate &lt;{attendanceThreshold}%):</span>
                    <strong className={group.atRiskCount > 0 ? 'text-rose-500 font-extrabold' : 'font-normal'}>
                      {group.atRiskCount} Student{group.atRiskCount === 1 ? '' : 's'}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Drilldown roster list for Selected Cohort */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden select-none">
        
        {/* Subheader and controller */}
        <div className="p-4 bg-slate-50/10 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-display">
              {selectedCohort === 'all' ? 'All Cohorts Collective Roster' : `Drilldown Roster: ${selectedCohort}`}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold">Listing all {sortedDisplayStudents.length} students enrolled under this intake selection</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search query box */}
            <div className="relative w-full sm:w-48 ">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search index..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 py-1.5 pl-8 pr-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition pl-8 placeholder:text-slate-400"
              />
            </div>

            {/* Sorting controller */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-150">
              <button
                type="button"
                onClick={() => {
                  setSelectedSort('name');
                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition ${
                  selectedSort === 'name' 
                    ? 'bg-white font-black text-slate-800 shadow-3xs' 
                    : 'text-slate-450 hover:text-slate-750'
                }`}
              >
                Sort Name {selectedSort === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSort('percentage');
                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition ${
                  selectedSort === 'percentage' 
                    ? 'bg-white font-black text-slate-800 shadow-3xs' 
                    : 'text-slate-450 hover:text-slate-750'
                }`}
              >
                Sort Rate {selectedSort === 'percentage' && (sortDirection === 'asc' ? '▲' : '▼')}
              </button>
            </div>
          </div>
        </div>

        {/* Drilldown Student Lists Table */}
        {sortedDisplayStudents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold bg-slate-50/5 p-4">
            No students enrolled matching index query or intake folder.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-5 py-3 text-left font-extrabold text-slate-450 uppercase tracking-widest text-[9.5px]">Student / ID</th>
                  <th className="px-5 py-3 text-left font-extrabold text-slate-450 uppercase tracking-widest text-[9.5px]">Proficiency Section</th>
                  <th className="px-5 py-3 text-center font-extrabold text-slate-450 uppercase tracking-widest text-[9.5px]">Intake Code</th>
                  <th className="px-5 py-3 text-center font-extrabold text-slate-450 uppercase tracking-widest text-[9.5px]">Days Log Ratio</th>
                  <th className="px-5 py-3 text-center font-extrabold text-slate-450 uppercase tracking-widest text-[9.5px]">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedDisplayStudents.map(({ student, presentCount, percentage, trackedDaysCount }) => {
                  const isWarning = percentage < attendanceThreshold && trackedDaysCount > 0;
                  const isGold = percentage === 100 && trackedDaysCount > 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/15 transition duration-100">
                      
                      {/* Name card */}
                      <td className="px-5 py-3 font-bold">
                        <div className="flex flex-col">
                          <span className="text-slate-850 font-sans">{student.name}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mt-0.5">{student.id}</span>
                        </div>
                      </td>

                      {/* Class level */}
                      <td className="px-5 py-3 text-slate-500 font-bold">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{sections.find(s => s.id === student.sectionId)?.name || 'Default Course'}</span>
                        </div>
                      </td>

                      {/* Intake tag */}
                      <td className="px-5 py-3 text-center select-none">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-750 font-black text-[9px] border border-indigo-100/30">
                          {student.intake || 'Default Intake'}
                        </span>
                      </td>

                      {/* Presence Ratio */}
                      <td className="px-5 py-3 text-center font-bold font-mono text-slate-400">
                        <span className="text-emerald-600 font-black">{presentCount}</span>
                        <span>/</span>
                        <span>{trackedDaysCount}</span>
                      </td>

                      {/* Rate meter with customized progress bar */}
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          
                          {/* Rate percentage */}
                          <div className="flex items-center gap-1 font-mono font-black w-14 shrink-0 justify-end">
                            <span className={`${
                              isGold ? 'text-amber-500' : isWarning ? 'text-rose-500' : 'text-slate-700'
                            }`}>{percentage}%</span>
                            {isGold && <Award className="w-3.5 h-3.5 text-amber-500" title="Perfect Cohort Member!" />}
                            {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" title="Needs immediate mentorship" />}
                          </div>

                          {/* Progress bar */}
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0 dark:bg-slate-100/80">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isGold 
                                  ? 'bg-amber-400' 
                                  : isWarning 
                                    ? 'bg-rose-500' 
                                    : 'bg-emerald-500'
                              }`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
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

      {/* Bottom Info Guidelines */}
      <div className="p-4 bg-indigo-50/20 border border-indigo-100/25 rounded-2xl flex items-start gap-3.5">
        <Info className="w-4 h-4 text-indigo-505 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed text-indigo-850 font-medium select-none">
          <strong className="text-indigo-900 font-bold block mb-0.5">Understanding Intake Calculations</strong>
          Under this cohort board, rolling attendance statistics are grouped exclusively by the student's entry cohort date code. In comparison with level of proficiency blocks, the Intake categories allow administrators to spot if older entry batches maintain streak persistence or encounter general declines in academic engagements.
        </div>
      </div>
    </div>
  );
}
