import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getUnifiedSubjectData, saveUnifiedSubjectData, fetchUnifiedSubjectData } from '../utils/dataStore';
import { getSectionStaff } from '../utils/timetableGenerator';
import { BookOpen, FlaskConical, GraduationCap, LayoutGrid, Clock, Award, User, Users } from 'lucide-react';
import { useUser } from '../context/UserContext';
import Toast from '../components/Toast';

// Helper removed in favor of unified dataStore

// Helper removed in favor of centralized getSectionStaff in timetableGenerator.js

const Subjects = () => {
    const { isHOD } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedYear, setSelectedYear] = useState('II CSE');
    const [selectedSemester, setSelectedSemester] = useState('Semester 3');

    // Manage subjects in local state for HOD editing
    const [localSubjectData, setLocalSubjectData] = useState(getUnifiedSubjectData);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [originalCode, setOriginalCode] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };
    const closeToast = () => setToast({ message: '', type: 'success' });

    // Async Load Updates
    useEffect(() => {
        const load = async () => {
            const fresh = await fetchUnifiedSubjectData();

            // Normalize: Ensure GEAR and COUN exist for all sem
            const mandatory = [
                { code: 'GEAR', name: 'GEAR UP', type: 'theory', category: 'normal', academicRule: { totalPeriods: 90, periodsPerWeek: 6, continuous: false }, staffConfig: { primary: [], substitute: [], coordinator: 'Coordinator' } },
                { code: 'COUN', name: 'Counselling', type: 'theory', category: 'normal', academicRule: { totalPeriods: 15, periodsPerWeek: 1, continuous: false }, staffConfig: { primary: [], substitute: [], coordinator: 'Counselling Team' } }
            ];

            let changed = false;
            const updated = JSON.parse(JSON.stringify(fresh));
            Object.keys(updated).forEach(y => {
                Object.keys(updated[y]).forEach(s => {
                    if (!updated[y][s].subjects) updated[y][s].subjects = [];
                    mandatory.forEach(m => {
                        const exists = updated[y][s].subjects.find(sub => sub.code === m.code);
                        if (!exists) {
                            updated[y][s].subjects.push(m);
                            changed = true;
                        }
                    });
                });
            });

            setLocalSubjectData(updated);
            if (changed) {
                saveUnifiedSubjectData(updated);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (location.state?.autoOpenAdd) {
            if (location.state.year) setSelectedYear(location.state.year);
            if (location.state.semester) setSelectedSemester(location.state.semester);
            setIsAddModalOpen(true);
            // Optionally clear state to prevent reopening on reload? 
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const [newSubject, setNewSubject] = useState({
        code: '',
        name: '',
        type: 'theory',
        category: 'normal',
        isCommon: false, // New: Big hall lecturer
        academicRule: { totalPeriods: 45, periodsPerWeek: 5, continuous: false },
        staffConfig: { primary: [], substitute: [], coordinator: '' },
        sectionStaff: { A: '', B: '', C: '' } // Internal state for multi-part entry
    });

    const years = useMemo(() => Object.keys(localSubjectData), [localSubjectData]);
    const semesters = useMemo(() => {
        return localSubjectData[selectedYear] ? Object.keys(localSubjectData[selectedYear]) : [];
    }, [selectedYear, localSubjectData]);

    const handleYearChange = (year) => {
        setSelectedYear(year);
        const firstSem = Object.keys(localSubjectData[year] || {})[0];
        if (firstSem) setSelectedSemester(firstSem);
    };

    const currentSubjects = useMemo(() => {
        const semData = localSubjectData[selectedYear]?.[selectedSemester];
        if (!semData) return [];

        const main = (semData.subjects || []).map(s => ({ ...s, isHonors: s.category === 'honour' }));
        const honorsData = (semData.honors || []).map(s => ({ ...s, category: 'honour', isHonors: true }));

        return [...main, ...honorsData];
    }, [selectedYear, selectedSemester, localSubjectData]);

    const handleDeleteSubject = async (code) => {
        if (code === 'GEAR' || code === 'COUN') {
            alert('Mandatory academic slots (GEAR UP / Counselling) cannot be deleted.');
            return;
        }
        if (window.confirm('Are you sure you want to delete this subject?')) {
            try {
                // Use deep copy to ensure reactivity and avoid reference issues
                const updatedData = JSON.parse(JSON.stringify(localSubjectData));
                const sem = updatedData[selectedYear]?.[selectedSemester];
                if (!sem) return;

                if (sem.subjects) sem.subjects = sem.subjects.filter(s => s.code !== code);
                if (sem.honors) sem.honors = sem.honors.filter(s => s.code !== code);

                setLocalSubjectData(updatedData);

                // Save to shared store (Async)
                try {
                    await saveUnifiedSubjectData(updatedData);
                } catch (apiErr) {
                    console.warn("Delete: API Save failed, but local storage is updated:", apiErr);
                    // Optionally alert for delete too, or just log
                }
            } catch (err) {
                console.error("Delete failed:", err);
                alert("Failed to delete subject. Please try again.");
            }
        }
    };

    const handleAddSubject = async (e) => {
        e.preventDefault();
        try {
            // Use deep clone to avoid mutating state directly
            const updatedData = JSON.parse(JSON.stringify(localSubjectData));
            if (!updatedData[selectedYear]) updatedData[selectedYear] = {};
            if (!updatedData[selectedYear][selectedSemester]) updatedData[selectedYear][selectedSemester] = { subjects: [], honors: [] };

            // Map sectionStaff back to primary array
            const staffA = newSubject.sectionStaff.A.split('\n').map(s => s.trim()).filter(Boolean);
            const staffB = newSubject.sectionStaff.B.split('\n').map(s => s.trim()).filter(Boolean);
            const staffC = newSubject.sectionStaff.C.split('\n').map(s => s.trim()).filter(Boolean);

            // VALIDATION: Ensure periods per week > 0
            if (!newSubject.academicRule.periodsPerWeek || newSubject.academicRule.periodsPerWeek < 1) {
                alert("Periods per week must be at least 1 for the subject to appear in the timetable.");
                return;
            }

            const subjectToSave = {
                code: newSubject.code,
                name: newSubject.name,
                type: newSubject.type,
                category: newSubject.category || 'normal',
                isCommon: newSubject.isCommon, // Persist hall lecture flag
                academicRule: { ...newSubject.academicRule },
                staffConfig: {
                    ...newSubject.staffConfig,
                    primary: [...staffA, ...staffB, ...staffC]
                }
            };

            const sem = updatedData[selectedYear][selectedSemester];
            if (!sem.subjects) sem.subjects = [];
            sem.subjects = [...sem.subjects, subjectToSave];

            setLocalSubjectData(updatedData);

            // Save to shared store (Async)
            // We wrap this in a separate try-catch so that API failure doesn't block the UI redirection
            try {
                await saveUnifiedSubjectData(updatedData);
            } catch (apiErr) {
                console.warn("API Save failed, but local storage is updated:", apiErr);
                alert("Note: Subject saved locally, but failed to sync with cloud. Check your connection.");
            }

            // Redirection logic should happen regardless of API success (as long as local state updated)
            if (location.state?.fromGenerator) {
                navigate('/generator', {
                    state: {
                        ...location.state,
                        newlyAddedSubjectCode: subjectToSave.code
                    }
                });
            } else {
                setIsAddModalOpen(false);
                setNewSubject({
                    code: '',
                    name: '',
                    type: 'theory',
                    isCommon: false,
                    academicRule: { totalPeriods: 60, periodsPerWeek: 5, continuous: false },
                    staffConfig: { primary: [], substitute: [], coordinator: '' },
                    sectionStaff: { A: '', B: '', C: '' }
                });
            }
        } catch (err) {
            console.error("Critical failure in handleAddSubject:", err);
            alert("Unexpected error occurred while adding subject.");
        }
    };

    const handleEditSubject = (subject) => {
        setEditingSubject({ ...subject });
        setOriginalCode(subject.code);
        setIsEditModalOpen(true);
    };

    const handleUpdateSubject = async (e) => {
        e.preventDefault();
        try {
            // Use deep clone to ensure reactivity and avoid mutating shared references
            const updatedData = JSON.parse(JSON.stringify(localSubjectData));
            const sem = updatedData[selectedYear][selectedSemester];

            // Update in subjects or honors array
            // Migration: If category changed OR code changed, move/replace efficiently
            // 1. Remove from BOTH to avoid duplicates/ghosts
            sem.subjects = (sem.subjects || []).filter(s => s.code !== originalCode && s.code !== editingSubject.code);
            sem.honors = (sem.honors || []).filter(s => s.code !== originalCode && s.code !== editingSubject.code);

            // 2. Insert into the correct array
            if (editingSubject.category === 'honour') {
                if (!sem.honors) sem.honors = [];
                sem.honors.push({ ...editingSubject });
            } else {
                if (!sem.subjects) sem.subjects = [];
                sem.subjects.push({ ...editingSubject });
            }

            setLocalSubjectData(updatedData);

            try {
                await saveUnifiedSubjectData(updatedData);
                showToast('Subject updated successfully!', 'success');
            } catch (apiErr) {
                console.warn('Edit: API Save failed, but local storage is updated:', apiErr);
                showToast('Saved locally, but failed to sync with cloud.', 'error');
            }

            setIsEditModalOpen(false);
            setEditingSubject(null);
        } catch (err) {
            console.error('Critical failure in handleUpdateSubject:', err);
            showToast('Failed to update subject. Please try again.', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-brand-light font-sans pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Subjects & Allocation</h1>
                        <p className="text-gray-500 mt-2">View and manage subject details and staff allocation.</p>
                    </div>
                    {isHOD && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-brand-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-md flex items-center gap-2"
                        >
                            <LayoutGrid size={20} /> Add New Subject
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Category / Year</label>
                        <div className="flex flex-wrap gap-2">
                            {years.map(year => (
                                <button
                                    key={year}
                                    onClick={() => handleYearChange(year)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedYear === year
                                        ? 'bg-brand-primary text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Semester / Group</label>
                        <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="w-full md:w-64 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none"
                        >
                            {semesters.map(sem => (
                                <option key={sem} value={sem}>{sem}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 gap-6">
                    {currentSubjects.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-400">No subjects found for this selection.</p>
                        </div>
                    ) : (
                        currentSubjects.map((subject, idx) => (
                            <motion.div
                                key={subject.code}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="p-6 border-b border-gray-50 flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${subject.type === 'lab' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {subject.type === 'lab' ? <FlaskConical size={24} /> : <BookOpen size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900">{subject.name}</h3>
                                                <div className="flex gap-1.5 font-bold">
                                                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">
                                                        {subject.code}
                                                    </span>
                                                    {subject.isHonors && (
                                                        <span className="px-2 py-0.5 rounded text-xs bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center gap-1">
                                                            <Award size={10} /> HONOURS
                                                        </span>
                                                    )}
                                                    {(subject.code === 'GEAR' || subject.code === 'COUN') && (
                                                        <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 border border-amber-200 font-bold uppercase tracking-tight">
                                                            Mandatory Period
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {subject.academicRule.totalPeriods} Hours Total
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <LayoutGrid size={14} />
                                                    {subject.academicRule.periodsPerWeek} / Week
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {isHOD && (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleEditSubject(subject)}
                                                className="text-sm text-brand-primary font-medium hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSubject(subject.code)}
                                                className="text-sm text-red-500 font-medium hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 bg-gray-50/50">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Staff Allocation</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {(() => {
                                            const sectionA = getSectionStaff(subject.staffConfig, 'A');
                                            const sectionB = getSectionStaff(subject.staffConfig, 'B');
                                            const sectionC = getSectionStaff(subject.staffConfig, 'C');
                                            return (
                                                <>
                                                    {/* Section A */}
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                            <User size={12} /> Section A
                                                        </span>
                                                        <div className="flex flex-col gap-2">
                                                            {sectionA.map((staff, i) => (
                                                                <div key={i} className="bg-white px-3 py-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                                                                    {staff}
                                                                </div>
                                                            ))}
                                                            {sectionA.length === 0 && (
                                                                <span className="text-xs text-gray-400 italic">Not Assigned</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Section B */}
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                            <User size={12} /> Section B
                                                        </span>
                                                        <div className="flex flex-col gap-2">
                                                            {sectionB.map((staff, i) => (
                                                                <div key={i} className="bg-white px-3 py-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                                                                    {staff}
                                                                </div>
                                                            ))}
                                                            {sectionB.length === 0 && (
                                                                <span className="text-xs text-gray-400 italic">Not Assigned</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Section C */}
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                            <User size={12} /> Section C
                                                        </span>
                                                        <div className="flex flex-col gap-2">
                                                            {sectionC.map((staff, i) => (
                                                                <div key={i} className="bg-white px-3 py-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                                                                    {staff}
                                                                </div>
                                                            ))}
                                                            {sectionC.length === 0 && (
                                                                <span className="text-xs text-gray-400 italic">Not Assigned</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Coordinator */}
                                                    {subject.staffConfig.coordinator && (
                                                        <div className="flex flex-col gap-2">
                                                            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                                <Award size={12} /> Subject Expert / Coordinator
                                                            </span>
                                                            <div className="bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100 text-sm font-medium text-amber-800 self-start">
                                                                {subject.staffConfig.coordinator}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Add Subject Modal */}
                <AnimatePresence>
                    {isAddModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
                            >
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">Add New Subject</h2>
                                    <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                                </div>
                                <form onSubmit={handleAddSubject} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                                            <input required type="text" value={newSubject.code} onChange={e => setNewSubject({ ...newSubject, code: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="e.g. CS2301" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                                            <input required type="text" value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="e.g. Data Structures" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Category</label>
                                            <select
                                                value={newSubject.isCommon ? 'common' : (newSubject.category || 'normal')}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === 'common') {
                                                        setNewSubject({ ...newSubject, isCommon: true, category: 'normal' });
                                                    } else {
                                                        setNewSubject({ ...newSubject, isCommon: false, category: val });
                                                    }
                                                }}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="honour">Honour (Cross-Department Sync)</option>
                                                <option value="common">Common (Big Hall - All Sections Sync)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Component</label>
                                            <select
                                                value={newSubject.type}
                                                onChange={e => {
                                                    const newType = e.target.value;
                                                    const defaultPeriods = newType === 'theory' ? 5 : 4;
                                                    setNewSubject({
                                                        ...newSubject,
                                                        type: newType,
                                                        academicRule: { ...newSubject.academicRule, periodsPerWeek: defaultPeriods }
                                                    });
                                                }}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                            >
                                                <option value="theory">Theory</option>
                                                <option value="lab">Laboratory</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Periods/Week</label>
                                            <input type="number" value={newSubject.academicRule.periodsPerWeek} onChange={e => setNewSubject({ ...newSubject, academicRule: { ...newSubject.academicRule, periodsPerWeek: parseInt(e.target.value) } })} className="w-full px-4 py-2 border rounded-lg" />
                                        </div>
                                    </div>

                                    {/* Staff Allocation Fields */}
                                    <div className="space-y-4 pt-4 border-t">
                                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Initial Staff Allocation</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Section A Staff</label>
                                                <textarea
                                                    value={newSubject.sectionStaff.A}
                                                    onChange={e => setNewSubject({ ...newSubject, sectionStaff: { ...newSubject.sectionStaff, A: e.target.value } })}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                    rows="2"
                                                    placeholder="One name per line"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Section B Staff</label>
                                                <textarea
                                                    value={newSubject.sectionStaff.B}
                                                    onChange={e => setNewSubject({ ...newSubject, sectionStaff: { ...newSubject.sectionStaff, B: e.target.value } })}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                    rows="2"
                                                    placeholder="One name per line"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Section C Staff</label>
                                                <textarea
                                                    value={newSubject.sectionStaff.C}
                                                    onChange={e => setNewSubject({ ...newSubject, sectionStaff: { ...newSubject.sectionStaff, C: e.target.value } })}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                    rows="2"
                                                    placeholder="One name per line"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Coordinator / Expert</label>
                                            <input
                                                type="text"
                                                value={newSubject.staffConfig.coordinator}
                                                onChange={e => setNewSubject({ ...newSubject, staffConfig: { ...newSubject.staffConfig, coordinator: e.target.value } })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                                placeholder="Enter coordinator name"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
                                        <button type="submit" className="bg-brand-primary text-white px-6 py-2 rounded-lg font-bold">
                                            {location.state?.fromGenerator ? 'Update' : 'Add Subject'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Edit Subject Modal */}
                <AnimatePresence>
                    {isEditModalOpen && editingSubject && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden my-8"
                            >
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">Edit Subject</h2>
                                    <button onClick={() => { setIsEditModalOpen(false); setEditingSubject(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                                </div>
                                <form onSubmit={handleUpdateSubject} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Basic Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={editingSubject.code}
                                                    onChange={e => setEditingSubject({ ...editingSubject, code: e.target.value })}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                    placeholder="e.g. CS2301"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={editingSubject.name}
                                                    onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                    placeholder="e.g. Data Structures"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Category</label>
                                                <select
                                                    value={editingSubject.isCommon ? 'common' : (editingSubject.category || 'normal')}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === 'common') {
                                                            setEditingSubject({ ...editingSubject, isCommon: true, category: 'normal' });
                                                        } else {
                                                            setEditingSubject({ ...editingSubject, isCommon: false, category: val });
                                                        }
                                                    }}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                >
                                                    <option value="normal">Normal</option>
                                                    <option value="honour">Honour (Cross-Department Sync)</option>
                                                    <option value="common">Common (Big Hall - All Sections Sync)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Component</label>
                                                <select
                                                    value={editingSubject.type}
                                                    onChange={e => {
                                                        const newType = e.target.value;
                                                        const defaultPeriods = newType === 'theory' ? 5 : 4;
                                                        setEditingSubject({
                                                            ...editingSubject,
                                                            type: newType,
                                                            academicRule: { ...editingSubject.academicRule, periodsPerWeek: defaultPeriods }
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                >
                                                    <option value="theory">Theory</option>
                                                    <option value="lab">Laboratory</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Periods</label>
                                                <input
                                                    type="number"
                                                    value={editingSubject.academicRule.totalPeriods}
                                                    onChange={e => setEditingSubject({ ...editingSubject, academicRule: { ...editingSubject.academicRule, totalPeriods: parseInt(e.target.value) } })}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Periods/Week</label>
                                                <input
                                                    type="number"
                                                    value={editingSubject.academicRule.periodsPerWeek}
                                                    onChange={e => setEditingSubject({ ...editingSubject, academicRule: { ...editingSubject.academicRule, periodsPerWeek: parseInt(e.target.value) } })}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Staff Allocation */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Staff Allocation</h3>
                                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                                            {/* Section A */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Section A Staff</label>
                                                <textarea
                                                    value={(() => {
                                                        const staff = getSectionStaff(editingSubject.staffConfig, 'A');
                                                        return staff.join('\n');
                                                    })()}
                                                    onChange={e => {
                                                        const newStaff = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                                                        const sectionB = getSectionStaff(editingSubject.staffConfig, 'B');
                                                        const sectionC = getSectionStaff(editingSubject.staffConfig, 'C');
                                                        setEditingSubject({
                                                            ...editingSubject,
                                                            staffConfig: {
                                                                ...editingSubject.staffConfig,
                                                                sectionA: newStaff,
                                                                sectionB: sectionB,
                                                                sectionC: sectionC,
                                                                primary: [...newStaff, ...sectionB, ...sectionC]
                                                            }
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                    placeholder="Enter staff names, one per line"
                                                    rows="3"
                                                />
                                            </div>

                                            {/* Section B */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Section B Staff</label>
                                                <textarea
                                                    value={(() => {
                                                        const staff = getSectionStaff(editingSubject.staffConfig, 'B');
                                                        return staff.join('\n');
                                                    })()}
                                                    onChange={e => {
                                                        const newStaff = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                                                        const sectionA = getSectionStaff(editingSubject.staffConfig, 'A');
                                                        const sectionC = getSectionStaff(editingSubject.staffConfig, 'C');
                                                        setEditingSubject({
                                                            ...editingSubject,
                                                            staffConfig: {
                                                                ...editingSubject.staffConfig,
                                                                sectionA: sectionA,
                                                                sectionB: newStaff,
                                                                sectionC: sectionC,
                                                                primary: [...sectionA, ...newStaff, ...sectionC]
                                                            }
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                    placeholder="Enter staff names, one per line"
                                                    rows="3"
                                                />
                                            </div>

                                            {/* Section C */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Section C Staff</label>
                                                <textarea
                                                    value={(() => {
                                                        const staff = getSectionStaff(editingSubject.staffConfig, 'C');
                                                        return staff.join('\n');
                                                    })()}
                                                    onChange={e => {
                                                        const newStaff = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                                                        const sectionA = getSectionStaff(editingSubject.staffConfig, 'A');
                                                        const sectionB = getSectionStaff(editingSubject.staffConfig, 'B');
                                                        setEditingSubject({
                                                            ...editingSubject,
                                                            staffConfig: {
                                                                ...editingSubject.staffConfig,
                                                                sectionA: sectionA,
                                                                sectionB: sectionB,
                                                                sectionC: newStaff,
                                                                primary: [...sectionA, ...sectionB, ...newStaff]
                                                            }
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                    placeholder="Enter staff names, one per line"
                                                    rows="3"
                                                />
                                            </div>

                                            {/* Coordinator */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Expert / Coordinator</label>
                                                <input
                                                    type="text"
                                                    value={editingSubject.staffConfig.coordinator || ''}
                                                    onChange={e => setEditingSubject({
                                                        ...editingSubject,
                                                        staffConfig: { ...editingSubject.staffConfig, coordinator: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none"
                                                    placeholder="Enter coordinator name"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <button
                                            type="button"
                                            onClick={() => { setIsEditModalOpen(false); setEditingSubject(null); }}
                                            className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="bg-brand-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-brand-dark transition-colors"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* Toast Notification */}
        <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
        />
    );
};

export default Subjects;
