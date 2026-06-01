import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, UserPlus, Trash2, Edit2, Check, X, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { Student, Section, AttendanceMap } from '../types';

interface StudentManagerProps {
  activeSection: Section;
  students: Student[];
  attendance: AttendanceMap;
  selectedDate: string;
  onAddStudent: (name: string, sectionId: string) => void;
  onEditStudent: (id: string, newName: string) => void;
  onDeleteStudent: (id: string) => void;
}

export default function StudentManager({
  activeSection,
  students,
  attendance,
  selectedDate,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
}: StudentManagerProps) {
  const [newStudentName, setNewStudentName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfId, setDeleteConfId] = useState<string | null>(null);

  // Filter students by current section & search term
  const sectionStudents = students.filter(student => student.sectionId === activeSection.id);
  const filteredStudents = sectionStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to render student name with search term highlight (background color change)
  const renderHighlightedName = (name: string, query: string) => {
    if (!query.trim()) {
      return (
        <span className="text-sm font-medium text-slate-700 truncate">
          {name}
        </span>
      );
    }

    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = name.split(regex);

    return (
      <span className="text-sm font-medium text-slate-700 truncate inline-flex items-center flex-wrap gap-0.5">
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span
              key={i}
              className="bg-amber-150 text-amber-900 rounded-md px-1 py-0.5 font-bold shadow-2xs animate-pulse transition-all"
              style={{ backgroundColor: '#fef08a' }} // Safe, high-visibility visual highlight
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = newStudentName.trim();
    if (!cleanName) return;
    onAddStudent(cleanName, activeSection.id);
    setNewStudentName('');
  };

  const handleStartEdit = (student: Student) => {
    setEditingStudentId(student.id);
    setEditingName(student.name);
    setDeleteConfId(null); // Cancel any delete prompts
  };

  const handleSaveEdit = (id: string) => {
    const cleanName = editingName.trim();
    if (!cleanName) return;
    onEditStudent(id, cleanName);
    setEditingStudentId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setEditingName('');
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteConfId(id);
    setEditingStudentId(null); // Cancel any edit modes
  };

  const handleConfirmDelete = (id: string) => {
    onDeleteStudent(id);
    setDeleteConfId(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfId(null);
  };

  return (
    <div id="student-manager-root" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header bar */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 font-display">
              {activeSection.name} Students
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Manage members of the {activeSection.name.toLowerCase()} group
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-indigo-50/80 rounded-full text-indigo-700 text-xs font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          {sectionStudents.length} {sectionStudents.length === 1 ? 'Student' : 'Students'} Total
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Form & Search Tools (horizontal split) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Add Student Form */}
          <form onSubmit={handleAddSubmit} className="md:col-span-7 flex gap-2">
            <div className="relative flex-1">
              <input
                id="add-student-input"
                type="text"
                placeholder="Full Name (e.g. John Doe)"
                value={newStudentName}
                onChange={e => setNewStudentName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition-all text-slate-800"
              />
            </div>
            <button
              id="add-student-btn"
              type="submit"
              disabled={!newStudentName.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm shadow-indigo-100 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Student</span>
            </button>
          </form>

          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-student-input"
              type="text"
              placeholder="Filter students by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition-all text-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Date Status Legend & Bar */}
        {sectionStudents.length > 0 && (
          <div id="attendance-status-legend-bar" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Active Calendar Date:</span>
              <span className="text-indigo-700 font-bold bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg">
                {(() => {
                  try {
                    return new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: 'UTC'
                    });
                  } catch (e) {
                    return selectedDate;
                  }
                })()}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
              <div className="flex items-center gap-1.5" title="Student is recorded as Present on the selected calendar date">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300" />
                <span className="text-[11px] font-medium text-slate-600">Present</span>
              </div>
              <div className="flex items-center gap-1.5" title="Student is recorded as Absent on the selected calendar date">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-300" />
                <span className="text-[11px] font-medium text-slate-600">Absent</span>
              </div>
              <div className="flex items-center gap-1.5" title="No attendance record is submitted or registered yet for this student on the selected date">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-200" />
                <span className="text-[11px] font-medium text-slate-500">No Record</span>
              </div>
            </div>
          </div>
        )}

        {/* Student List View */}
        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20">
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {sectionStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-medium text-slate-700">No Students Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Add students to start tracking their attendance in this group.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">
                  No students match "<span className="font-semibold">{searchTerm}</span>"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium underline"
                >
                  Clear search filter
                </button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredStudents.map((student, index) => {
                  const isEditing = editingStudentId === student.id;
                  const isPendingDelete = deleteConfId === student.id;

                  return (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`px-5 py-3.5 flex items-center justify-between gap-4 transition-all duration-150 border-l-3 border-transparent ${
                        isEditing
                          ? 'bg-amber-50/30 border-l-amber-400 pl-[17px]'
                          : isPendingDelete
                          ? 'bg-rose-50/50 border-l-rose-400 pl-[17px]'
                          : searchTerm
                          ? 'bg-amber-50/20 hover:bg-amber-50/40 border-l-amber-300 pl-[17px]'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Name area */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit(student.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              className="w-full max-w-md px-3 py-1.5 bg-white border border-indigo-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            {(() => {
                              const dateRecords = attendance[selectedDate] || {};
                              const studentStatus = dateRecords[student.id];
                              
                              let statusColorClass = 'bg-slate-300 border-slate-100';
                              let statusTitle = 'No record for currently selected date';
                              
                              if (studentStatus === 'present') {
                                statusColorClass = 'bg-emerald-500 border-white ring-1 ring-emerald-100';
                                statusTitle = 'Present';
                              } else if (studentStatus === 'absent') {
                                statusColorClass = 'bg-rose-500 border-white ring-1 ring-rose-100';
                                statusTitle = 'Absent';
                              }
                              
                              return (
                                <div className="relative shrink-0 select-none">
                                  <span className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-semibold border border-slate-150">
                                    {index + 1}
                                  </span>
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${statusColorClass} transition-all duration-200`}
                                    title={statusTitle}
                                  />
                                </div>
                              );
                            })()}
                            {renderHighlightedName(student.name, searchTerm)}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(student.id)}
                              disabled={!editingName.trim()}
                              className="p-1.5 hover:bg-emerald-100 text-emerald-600 disabled:opacity-50 disabled:hover:bg-transparent rounded-lg transition"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : isPendingDelete ? (
                          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/60 px-2.5 py-1 rounded-xl">
                            <span className="text-xs font-semibold text-rose-700 animate-pulse">
                              Delete?
                            </span>
                            <button
                              onClick={() => handleConfirmDelete(student.id)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xxs font-semibold transition"
                            >
                              Yes
                            </button>
                            <button
                              onClick={handleCancelDelete}
                              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xxs font-semibold transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(student)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                              title="Edit Student Name"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRequest(student.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="Delete Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
