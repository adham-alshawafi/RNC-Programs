import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Search, 
  Calendar, 
  Grid, 
  FileSpreadsheet, 
  Layers, 
  Users, 
  BookOpen, 
  BarChart3, 
  Check, 
  Clock, 
  Activity,
  CornerDownLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Section } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  students: Student[];
  currentTab: string;
  onSelectTab: (tab: 'attendance' | 'weekly_grid' | 'monthly_board' | 'intake_board' | 'students' | 'calculator' | 'student_calendar') => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onMarkAllPresent?: () => void;
  onMarkAllAbsent?: () => void;
  onClearAttendance?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'Navigation' | 'Cohort / Level' | 'Quick Actions' | 'Students';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  sections,
  activeSectionId,
  onSelectSection,
  students,
  currentTab,
  onSelectTab,
  selectedDate,
  onSelectDate,
  onMarkAllPresent,
  onMarkAllAbsent,
  onClearAttendance
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      // Small timeout to allow input rendering
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Standard commands list
  const paletteItems = useMemo(() => {
    const items: PaletteItem[] = [];

    // Category 1: Navigation
    const navs: { tab: any; name: string; desc: string; icon: React.ReactNode }[] = [
      { tab: 'attendance', name: 'Mark Attendance (Roster)', desc: 'Roll check register and dates', icon: <Calendar className="w-4 h-4" /> },
      { tab: 'weekly_grid', name: 'Weekly Board Grid', desc: 'Active week overview', icon: <Grid className="w-4 h-4" /> },
      { tab: 'monthly_board', name: 'Monthly Board Tracker', desc: 'Consolidated grid metrics', icon: <FileSpreadsheet className="w-4 h-4" /> },
      { tab: 'intake_board', name: 'Intake Cohorts Board', desc: 'Group student intakes', icon: <Layers className="w-4 h-4" /> },
      { tab: 'students', name: 'Manage Registered Students', desc: 'Add, edit, withdraw entries', icon: <Users className="w-4 h-4" /> },
      { tab: 'student_calendar', name: 'Individual Student Profiles', desc: 'Personal calendar calendar lookups', icon: <BookOpen className="w-4 h-4" /> },
      { tab: 'calculator', name: 'Attendance Audit Metrics', desc: 'Calculate custom timelines and stats', icon: <BarChart3 className="w-4 h-4 text-indigo-500" /> },
    ];

    navs.forEach(n => {
      items.push({
        id: `nav-${n.tab}`,
        category: 'Navigation',
        title: `Switch tab to: ${n.name}`,
        subtitle: n.desc,
        icon: n.icon,
        action: () => {
          onSelectTab(n.tab);
          onClose();
        }
      });
    });

    // Category 2: Cohorts / Levels
    sections.forEach(sec => {
      const activeText = sec.id === activeSectionId ? ' (Active)' : '';
      items.push({
        id: `sec-${sec.id}`,
        category: 'Cohort / Level',
        title: `Change Class to Level: ${sec.name}${activeText}`,
        subtitle: `Switch focus to this section's students and charts`,
        icon: <Users className="w-4 h-4 text-indigo-400" />,
        action: () => {
          onSelectSection(sec.id);
          onClose();
        }
      });
    });

    // Category 3: Quick Roster Metrics (Only active if on attendance roster)
    if (currentTab === 'attendance' && onMarkAllPresent && onMarkAllAbsent && onClearAttendance) {
      items.push({
        id: 'action-all-present',
        category: 'Quick Actions',
        title: 'Roster Action: Mark Everyone Present Today',
        subtitle: `Set all active students search to present on ${selectedDate}`,
        icon: <Check className="w-4 h-4 text-emerald-500" />,
        action: () => {
          onMarkAllPresent();
          onClose();
        }
      });
      items.push({
        id: 'action-all-absent',
        category: 'Quick Actions',
        title: 'Roster Action: Mark Everyone Absent Today',
        subtitle: `Set all active students search to absent on ${selectedDate}`,
        icon: <X className="w-4 h-4 text-rose-500" />,
        action: () => {
          onMarkAllAbsent();
          onClose();
        }
      });
      items.push({
        id: 'action-clear-all',
        category: 'Quick Actions',
        title: 'Roster Action: Clear Attendance Marks for Today',
        subtitle: `Clear draft marks for ${selectedDate}`,
        icon: <Clock className="w-4 h-4 text-slate-400" />,
        action: () => {
          onClearAttendance();
          onClose();
        }
      });
    }

    // Category 4: Active Students (Quick profiles selection)
    const activeSectionStudents = students.filter(s => s.sectionId === activeSectionId);
    activeSectionStudents.forEach(st => {
      items.push({
        id: `student-${st.id}`,
        category: 'Students',
        title: `Open Profile: ${st.name}`,
        subtitle: `Intake: ${st.intake || 'Default'} ${st.isWithdrawn ? '(Withdrawn)' : ''}`,
        icon: <BookOpen className={`w-4 h-4 ${st.isWithdrawn ? 'text-slate-305' : 'text-emerald-500'}`} />,
        action: () => {
          localStorage.setItem('attendance_selected_student_id', st.id);
          onSelectTab('student_calendar');
          onClose();
        }
      });
    });

    return items;
  }, [sections, activeSectionId, students, currentTab, selectedDate, onSelectTab, onSelectSection, onMarkAllPresent, onMarkAllAbsent, onClearAttendance, onClose]);

  // Filtered list
  const filteredItems = useMemo(() => {
    if (!search.trim()) return paletteItems;
    const cleanSearch = search.toLowerCase().trim();
    return paletteItems.filter(
      item => 
        item.title.toLowerCase().includes(cleanSearch) || 
        item.subtitle?.toLowerCase().includes(cleanSearch) ||
        item.category.toLowerCase().includes(cleanSearch)
    );
  }, [search, paletteItems]);

  // Keep index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(0);
    }
  }, [filteredItems, selectedIndex]);

  // Handle keys inside palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Auto scroll into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="command-palette-backdrop"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-start justify-center pt-20 px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="command-palette-modal"
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[480px] overflow-hidden"
        >
          {/* Search Box */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 font-medium"
            />
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-[9px] font-bold text-slate-600 select-none">ESC</span>
              <button 
                type="button" 
                onClick={onClose}
                className="p-1 hover:bg-slate-200/60 rounded text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Guidelines Header / Tip */}
          <div className="px-5 py-2.5 bg-indigo-50/40 border-b border-indigo-100/30 flex items-center justify-between text-[10px] font-semibold text-indigo-750 select-none">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Tip: Use keys <kbd className="bg-white px-1 border rounded">↑</kbd> <kbd className="bg-white px-1 border rounded">↓</kbd> and <kbd className="bg-white px-1 border rounded">Enter</kbd> to fly through controls</span>
            </div>
            <div className="text-[9px] font-black tracking-widest text-indigo-650 flex items-center gap-1 leading-none uppercase">
              <Activity className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>Power Mode</span>
            </div>
          </div>

          {/* Results List */}
          <div 
            ref={listRef}
            className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50 min-h-[150px]"
          >
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-slate-450 flex flex-col items-center justify-center space-y-2">
                <Search className="w-8 h-8 text-slate-305" />
                <h5 className="text-xs font-bold text-slate-700">No Matching Search Results</h5>
                <p className="text-[10px] normal-case">Try searching for other tabs, sections, actions, or registered students.</p>
              </div>
            ) : (
              // Grouped items
              Object.entries(
                filteredItems.reduce((acc, item) => {
                  if (!acc[item.category]) acc[item.category] = [];
                  acc[item.category].push(item);
                  return acc;
                }, {} as Record<string, PaletteItem[]>)
              ).map(([category, items]) => (
                <div key={category} className="pt-2 first:pt-0 pb-1.5">
                  <h6 className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">
                    {category}
                  </h6>
                  <div className="space-y-0.5">
                    {(items as PaletteItem[]).map((item) => {
                      // Get flat item index in total filtered list
                      const flatIndex = filteredItems.findIndex(f => f.id === item.id);
                      const isSelected = flatIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-active={isSelected ? "true" : "false"}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(flatIndex)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150/40' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${
                              isSelected ? 'bg-indigo-700/60 text-indigo-100' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <span className={`block text-xs font-bold leading-normal truncate ${
                                isSelected ? 'text-white' : 'text-slate-805'
                              }`}>
                                {item.title}
                              </span>
                              {item.subtitle && (
                                <span className={`block text-[10px] leading-snug truncate ${
                                  isSelected ? 'text-indigo-200' : 'text-slate-400 font-semibold'
                                }`}>
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="flex items-center gap-1 select-none text-[9px] text-indigo-100/80 font-bold shrink-0">
                              <span>Select</span>
                              <CornerDownLeft className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer details */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-400 select-none">
            <span className="font-semibold text-[9px]">
              Showing {filteredItems.length} of {paletteItems.length} active controls
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <kbd className="bg-white border text-[8px] font-black px-1 rounded shadow-3xs">TAB</kbd>
                <span>Cycle</span>
              </span>
              <span className="flex items-center gap-0.5">
                <kbd className="bg-white border text-[8px] font-black px-1 rounded shadow-3xs">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
