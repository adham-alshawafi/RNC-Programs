import React, { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, UserPlus, Trash2, Edit2, Check, X, Users, AlertCircle, RefreshCw, Upload, FileSpreadsheet, Info, Download } from 'lucide-react';
import { Student, Section, AttendanceMap } from '../types';

interface StudentManagerProps {
  activeSection: Section;
  students: Student[];
  attendance: AttendanceMap;
  selectedDate: string;
  onAddStudent: (name: string, sectionId: string, intake?: string) => void;
  onEditStudent: (id: string, newName: string, newIntake?: string) => void;
  onDeleteStudent: (id: string) => void;
  onAddStudentsBatch?: (newStudents: { name: string; intake?: string }[]) => void;
}

export default function StudentManager({
  activeSection,
  students,
  attendance,
  selectedDate,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onAddStudentsBatch,
}: StudentManagerProps) {
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentIntake, setNewStudentIntake] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIntake, setEditingIntake] = useState('');
  const [deleteConfId, setDeleteConfId] = useState<string | null>(null);

  // CSV Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [csvParsedData, setCsvParsedData] = useState<{ name: string; intake?: string }[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [isFileReading, setIsFileReading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processCSVFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processCSVFile(file);
    }
  };

  const processCSVFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && !file.name.endsWith('.txt')) {
      setImportError('Please upload a valid CSV or TXT file.');
      setCsvParsedData([]);
      return;
    }

    setIsFileReading(true);
    setImportError(null);
    setImportSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.trim()) {
          setImportError('The file appears to be empty.');
          setIsFileReading(false);
          return;
        }

        // Parse lines
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) {
          setImportError('No valid content found in file.');
          setIsFileReading(false);
          return;
        }

        // Let's determine if the first line is a header
        let parsedRows: { name: string; intake?: string }[] = [];
        
        // CSV parsing helper (supports commas, basic quotes)
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim().replace(/^"|"$/g, ''));
          return result;
        };

        const firstRowCells = parseCSVLine(lines[0]);
        // Typical headers: "name", "full name", "student name", "intake", "cohort", "group"
        const lowerCells = firstRowCells.map(c => c.toLowerCase().trim());
        const hasHeader = lowerCells.some(cell => 
          cell.includes('name') || 
          cell.includes('intake') || 
          cell.includes('cohort') || 
          cell.includes('student')
        );

        let startIndex = 0;
        let nameColIdx = 0;
        let intakeColIdx = -1;

        if (hasHeader) {
          startIndex = 1;
          // Find matching columns
          nameColIdx = lowerCells.findIndex(cell => cell.includes('name') || cell.includes('student'));
          if (nameColIdx === -1) nameColIdx = 0; // Default to first col
          intakeColIdx = lowerCells.findIndex(cell => cell.includes('intake') || cell.includes('cohort'));
        } else {
          // If no header, let's assume index 0 is Name and index 1 (if exists) is Intake
          nameColIdx = 0;
          if (firstRowCells.length > 1) {
            intakeColIdx = 1;
          }
        }

        for (let i = startIndex; i < lines.length; i++) {
          const cells = parseCSVLine(lines[i]);
          if (cells.length > 0 && cells[nameColIdx]) {
            const name = cells[nameColIdx].trim();
            if (name) {
              const intake = intakeColIdx !== -1 && cells[intakeColIdx] 
                ? cells[intakeColIdx].trim() 
                : undefined;
              parsedRows.push({ name, intake });
            }
          }
        }

        if (parsedRows.length === 0) {
          setImportError('Could not extract any valid student names from the file. Please ensure there is a "name" column or names are listed.');
        } else {
          setCsvParsedData(parsedRows);
        }
      } catch (err) {
        setImportError('An error occurred while parsing the file. Please check your CSV format.');
      } finally {
        setIsFileReading(false);
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read file.');
      setIsFileReading(false);
    };

    reader.readAsText(file);
  };

  const handleCommitImport = () => {
    if (csvParsedData.length === 0) return;
    if (onAddStudentsBatch) {
      onAddStudentsBatch(csvParsedData);
    } else {
      csvParsedData.forEach(s => {
        onAddStudent(s.name, activeSection.id, s.intake);
      });
    }
    setImportSuccessCount(csvParsedData.length);
    setCsvParsedData([]);
    // Automatically close the block after 4.5 seconds
    setTimeout(() => {
      setImportSuccessCount(null);
    }, 4500);
  };

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
    onAddStudent(cleanName, activeSection.id, newStudentIntake.trim() || undefined);
    setNewStudentName('');
    setNewStudentIntake('');
  };

  const handleStartEdit = (student: Student) => {
    setEditingStudentId(student.id);
    setEditingName(student.name);
    setEditingIntake(student.intake || 'Default Intake');
    setDeleteConfId(null); // Cancel any delete prompts
  };

  const handleSaveEdit = (id: string) => {
    const cleanName = editingName.trim();
    if (!cleanName) return;
    onEditStudent(id, cleanName, editingIntake.trim() || undefined);
    setEditingStudentId(null);
    setEditingName('');
    setEditingIntake('');
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
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsImportOpen(prev => !prev);
              setImportError(null);
              setCsvParsedData([]);
              setImportSuccessCount(null);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all duration-150 cursor-pointer select-none active:scale-95 ${
              isImportOpen
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          
          <div className="px-3 py-1.5 bg-indigo-50/80 rounded-full text-indigo-700 text-xs font-semibold flex items-center gap-1.5 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            {sectionStudents.length} {sectionStudents.length === 1 ? 'Student' : 'Students'} Total
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* CSV Import Drawers */}
        <AnimatePresence>
          {isImportOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border border-slate-150 rounded-2xl bg-linear-to-b from-indigo-50/20 via-indigo-50/5 to-transparent select-none"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                      <span>Bulk Import Students via CSV</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 max-w-2xl leading-relaxed font-medium">
                      Upload a CSV file containing your class list. The system automatically detects student names and optional intake columns. Any students imported here will be added to the <strong className="text-indigo-700 font-bold">"{activeSection.name}"</strong> class.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Import stats / progress */}
                {importSuccessCount !== null && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200/50 rounded-xl flex items-center gap-3 animate-fade-in text-emerald-800">
                    <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-black">Success!</span>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Imported {importSuccessCount} students seamlessly into "{activeSection.name}".
                      </p>
                    </div>
                  </div>
                )}

                {importError && (
                  <div className="p-4 bg-rose-50 border border-rose-200/50 rounded-xl flex items-center gap-3 animate-fade-in text-rose-800">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                    <div>
                      <span className="text-xs font-black">Import Error</span>
                      <p className="text-[11px] text-rose-700 font-medium">{importError}</p>
                    </div>
                  </div>
                )}

                {csvParsedData.length > 0 ? (
                  <div className="border border-slate-150 rounded-xl bg-white/80 backdrop-blur-xs shadow-3xs p-4 space-y-3.5 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">Parsed Preview</span>
                        <h5 className="text-xs font-bold text-slate-705 mt-1">Ready to import {csvParsedData.length} student{csvParsedData.length === 1 ? '' : 's'}</h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCsvParsedData([])}
                          className="px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer select-none"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCommitImport}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Commit Import</span>
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[160px] overflow-y-auto divide-y divide-slate-50 border border-slate-100 rounded-lg select-none">
                      {csvParsedData.map((row, idx) => (
                        <div key={idx} className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/50">
                          <span className="font-semibold text-slate-700 truncate max-w-sm">{row.name}</span>
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md shrink-0 border border-indigo-100/30">
                            {row.intake || 'Default Intake'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Drag-and-drop zone */}
                    <div className="lg:col-span-7">
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[150px] select-none ${
                          dragActive
                            ? 'border-indigo-500 bg-indigo-50/55 scale-[0.99] shadow-inner'
                            : 'border-slate-200 hover:border-indigo-400 bg-white hover:bg-slate-50/20'
                        }`}
                        onClick={() => document.getElementById('csv-file-uploader')?.click()}
                      >
                        <input
                          id="csv-file-uploader"
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        {isFileReading ? (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                            <span className="text-[11px] font-semibold text-slate-500">Parsing spreadsheet...</span>
                          </div>
                        ) : (
                          <>
                            <div className={`p-2.5 rounded-full mb-2 transition-colors ${
                              dragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <Upload className="w-5 h-5 text-indigo-550 shrink-0" />
                            </div>
                            <p className="text-xs font-extrabold text-slate-700">
                              {dragActive ? 'Drop your spreadsheet file here' : 'Drag & drop your CSV file here, or click to browse'}
                            </p>
                            <p className="text-[10px] text-slate-450 font-semibold mt-1">
                              Supports standard .csv and .txt list formats
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* File template guidelines */}
                    <div className="lg:col-span-5 bg-slate-50/50 border border-slate-150/70 rounded-2xl p-4 flex flex-col justify-between text-xs space-y-2.5">
                      <div className="space-y-1.5">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1.5 select-none text-[11px] uppercase tracking-wider text-indigo-600">
                          <Info className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Accepted CSV Formats</span>
                        </span>
                        
                        <div className="space-y-2 font-semibold text-slate-500 leading-normal pl-0.5 text-[10.5px]">
                          <p>Your file must follow one of these structure templates:</p>
                          <ul className="list-disc pl-3.5 space-y-1.5 text-slate-500 font-bold font-mono text-[9.5px]">
                            <li>
                              <strong className="text-indigo-650">Simple names list (no header):</strong>
                              <span className="block text-slate-400 bg-white border border-slate-200 rounded px-2 py-0.5 mt-0.5 font-normal">
                                Alice Green<br />Bob White
                              </span>
                            </li>
                            <li>
                              <strong className="text-indigo-650">With columns headers:</strong>
                              <span className="block text-slate-400 bg-white border border-slate-200 rounded px-2 py-0.5 mt-0.5 font-normal">
                                Student Name, Intake<br />Alice Green, May 2026
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-150/60 flex items-center justify-between gap-2">
                        <span className="text-[9px] text-slate-400 font-bold">Need a template file?</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const templateContent = "Name,Intake\nAlice Green,May 2026\nBob White,June 2026\nCharlie Grey,September 2026";
                            const blob = new Blob([templateContent], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = "students_import_template.csv";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-[10px] text-indigo-605 hover:text-indigo-800 font-extrabold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download Sample CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form & Search Tools (horizontal split) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Add Student Form */}
          <form onSubmit={handleAddSubmit} className="md:col-span-7 flex flex-col sm:flex-row gap-2">
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
            <div className="relative w-full sm:w-44">
              <input
                id="add-student-intake"
                type="text"
                placeholder="Intake (e.g. May 2026)"
                value={newStudentIntake}
                onChange={e => setNewStudentIntake(e.target.value)}
                list="existing-intakes-list"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition-all text-slate-804 text-xs font-bold"
              />
              <datalist id="existing-intakes-list">
                {Array.from(new Set(sectionStudents.map(s => s.intake).filter(Boolean))).map(it => (
                  <option key={it} value={it} />
                ))}
                <option value="Jan 2026" />
                <option value="May 2026" />
                <option value="Jun 2026" />
                <option value="Sep 2026" />
              </datalist>
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
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit(student.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              className="w-full max-w-xs px-3 py-1.5 bg-white border border-indigo-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800 animate-fade-in"
                              placeholder="Full Name"
                            />
                            <input
                              type="text"
                              value={editingIntake}
                              onChange={e => setEditingIntake(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit(student.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              className="w-full sm:w-40 px-3 py-1.5 bg-white border border-indigo-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
                              placeholder="Intake (Cohort)"
                              list="existing-intakes-list"
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
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3.5">
                              {renderHighlightedName(student.name, searchTerm)}
                              <span className="inline-flex px-2 py-0.5 rounded bg-indigo-50 border border-indigo-120 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider self-start sm:self-auto transition-colors">
                                {student.intake || 'Default Intake'}
                              </span>
                            </div>
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
