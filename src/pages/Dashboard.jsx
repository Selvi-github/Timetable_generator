import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, RotateCcw, Check, Plus, Trash2, Calendar, Users, BookOpen, RefreshCcw, LayoutGrid, LogOut, AlertTriangle } from 'lucide-react';
import { getUnifiedSubjectData, fetchUnifiedSubjectData, rebuildGlobalUsageMaps } from '../utils/dataStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const Dashboard = () => {
    const { user, isHOD } = useUser();
    const navigate = useNavigate();

    // Data State
    const [allSubjectData, setAllSubjectData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation(); // Needed for Edit Mode

    // Initial Load & Listen for updates
    useEffect(() => {
        const loadData = async () => {
            // We can use the sync version for instant render, then update with async?
            // Or just wait. Searching for "Real Live Data" implies we should wait for latest.
            // But for UX, instant load is better.
            // Strategy: Load Sync first (fast), then Fetch Async (latest).

            // 1. Instant Load (Cache)
            const cached = getUnifiedSubjectData();
            setAllSubjectData(cached);

            // 2. Network Load (Fresh)
            setIsLoading(true);
            const fresh = await fetchUnifiedSubjectData();
            setAllSubjectData(fresh);
            setIsLoading(false);
        };

        loadData();

        const handleUpdate = () => {
            // If local update happened, we refresh sync. 
            // Ideally we should refetch async too if it was a remote update, but we don't have real-time subscriptions yet.
            setAllSubjectData(getUnifiedSubjectData());
        };

        window.addEventListener('subjectDataUpdated', handleUpdate);
        return () => window.removeEventListener('subjectDataUpdated', handleUpdate);
    }, []);

    // HOD State
    const [selectedYear, setSelectedYear] = useState('II CSE');
    const [selectedSemester, setSelectedSemester] = useState('Semester 4');
    const [selectedSection, setSelectedSection] = useState('A');

    // Selection State
    // Format: [{ code: 'CS2251', fixedDay: 'Monday', fixedSlot: 1 }]
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [availSubjects, setAvailSubjects] = useState([]);

    // Generator State
    const [isGenerating, setIsGenerating] = useState(false);

    // Campus View State
    const [semesterType, setSemesterType] = useState('EVEN'); // Default to current academic phase

    // Load available subjects when Year/Sem changes
    useEffect(() => {
        const allData = getUnifiedSubjectData();
        const semData = allData[selectedYear]?.[selectedSemester];
        if (!semData) {
            setAvailSubjects([]);
            // Don't clear selectedSubjects here if we are in Edit Mode loading!!
            // Only clear if user MANUALLY changed Year/Sem, not if setting from Edit.
            // For now, simple logic: if subjects are already selected (from Edit), don't clear them?
            // actually, we should only clear if not matching.
            // But simpler: Edit Mode useEffect will override this anyway.
            // Let's rely on the Edit Mode Effect below.
            return;
        }

        const combined = [
            ...(semData.subjects || []),
            ...(semData.honors || [])
        ];
        // previously filtered GEAR/COUN, now removed to allow dynamic periods

        setAvailSubjects(combined);
    }, [selectedYear, selectedSemester, allSubjectData]);

    // HANDLE EDIT MODE & RETURNS (Incoming from Timetable View or Subjects Page)
    useEffect(() => {
        // 1. Edit Mode from Timetable
        if (location.state?.editConfig && Object.keys(allSubjectData).length > 0) {
            const conf = location.state.editConfig;
            setSelectedYear(conf.year);
            setSelectedSemester(conf.semester);
            setSelectedSection(conf.section);

            const hydratedSubjects = conf.subjects.map(s => ({
                ...s,
                fixedDay: s.fixedDay || '',
                fixedSlot: s.fixedSlot || '',
                periodType: s.periodType || 'non-continuous',
                continuousCount: s.continuousCount || 2
            }));
            setSelectedSubjects(hydratedSubjects);
            window.scrollTo(0, 0);

            // Clear editConfig to prevent re-processing on state changes? 
            // Actually replaceState is better.
            window.history.replaceState({ ...location.state, editConfig: null }, document.title);
        }

        // 2. Return from "Add Subject" Page
        if (location.state?.newlyAddedSubjectCode) {
            const newCode = location.state.newlyAddedSubjectCode;
            if (!selectedSubjects.some(s => s.code === newCode)) {
                setSelectedSubjects(prev => [...prev, {
                    code: newCode,
                    fixedDay: '',
                    fixedSlot: '',
                    periodType: 'non-continuous',
                    continuousCount: 2
                }]);
            }

            // If we came from Campus View, we might want to automatically jump back 
            // BUT the user wants to see it in the configuration first.
            // The prompt says "when I click update table it will goes to that table in campus view"
            // This refers to the Generate buttons below.

            // Clear that state so it doesn't re-add on Refresh
            window.history.replaceState({ ...location.state, newlyAddedSubjectCode: null }, document.title);
        }
    }, [location.state, allSubjectData]);

    // SYNC SELECTED SUBJECTS WITH LATEST DATA
    useEffect(() => {
        if (!allSubjectData || Object.keys(allSubjectData).length === 0) return;

        const semDetails = allSubjectData[selectedYear]?.[selectedSemester];
        const latestAll = [
            ...(semDetails?.subjects || []),
            ...(semDetails?.honors || [])
        ];

        setSelectedSubjects(prev => {
            let changed = false;
            const updated = prev.map(sel => {
                const latest = latestAll.find(l => l.code === sel.code);
                if (!latest) return sel;

                // Check if academic rules changed
                const isDifferent = JSON.stringify(sel.academicRule) !== JSON.stringify(latest.academicRule);
                if (isDifferent) {
                    changed = true;
                    return {
                        ...sel,
                        ...latest,
                        academicRule: { ...latest.academicRule }
                    };
                }
                return sel;
            });

            return changed ? updated : prev;
        });
    }, [allSubjectData, selectedYear, selectedSemester]);

    const handleAddSubject = (subjectCode) => {
        if (!subjectCode) return;
        if (selectedSubjects.some(s => s.code === subjectCode)) return;
        if (selectedSubjects.length >= 30) {
            alert("Maximum limit of 30 subjects reached.");
            return;
        }

        setSelectedSubjects(prev => [...prev, {
            code: subjectCode,
            fixedDay: '',
            fixedSlot: '',
            periodType: 'non-continuous',
            continuousCount: 2
        }]);

        // Auto-scroll to bottom of list
        setTimeout(() => {
            const list = document.getElementById('selected-list');
            if (list) list.scrollTop = list.scrollHeight;
        }, 100);
    };

    const handleRemoveSubject = (code) => {
        setSelectedSubjects(prev => prev.filter(s => s.code !== code));
    };

    const handleUpdateFixedSlot = (code, field, value) => {
        setSelectedSubjects(prev => prev.map(s =>
            s.code === code ? { ...s, [field]: value } : s
        ));
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        // Refresh Global Usage Map from Cloud to ensure 100% conflict detection
        try {
            await rebuildGlobalUsageMaps();
        } catch (e) {
            console.error("Conflict Sync Warning:", e);
        }

        // 1. Validate Subjects (0 Periods Check)
        let subjectsToGenerate = [...selectedSubjects];

        const zeroPeriodSubjects = subjectsToGenerate.filter(s => {
            const detail = availSubjects.find(sub => sub.code === s.code);
            // Robust check: handle missing detail or missing academicRule
            const periods = (detail?.academicRule?.periodsPerWeek !== undefined)
                ? detail.academicRule.periodsPerWeek
                : (allSubjectData[selectedYear]?.[selectedSemester]?.subjects?.find(x => x.code === s.code)?.academicRule?.periodsPerWeek || 0);
            return parseInt(periods) < 1;
        });

        if (zeroPeriodSubjects.length > 0) {
            const names = zeroPeriodSubjects.map(s => s.code).join(', ');
            const shouldAutoFix = window.confirm(
                `⚠️ BLOCKER: The following subjects have 0 periods assigned:\n\n${names}\n\nThey cannot be placed in the timetable.\n\nClick OK to automatically REMOVE them and continue generating.\nClick Cancel to stop and fix them manually.`
            );

            if (shouldAutoFix) {
                // Auto-fix: Remove invalid subjects
                subjectsToGenerate = subjectsToGenerate.filter(s => !zeroPeriodSubjects.some(z => z.code === s.code));
                setSelectedSubjects(subjectsToGenerate); // Update UI state too
            } else {
                setIsGenerating(false);
                return;
            }
        }

        if (subjectsToGenerate.length === 0) {
            alert("No valid subjects selected to generate.");
            setIsGenerating(false);
            return;
        }

        // Simulate processing for UX
        await new Promise(r => setTimeout(r, 800));

        const currentConfig = {
            year: selectedYear,
            semester: selectedSemester,
            section: selectedSection,
            subjects: selectedSubjects, // Includes fixed slots
            allSubjectsData: allSubjectData // Pass the latest async loaded data
        };

        // CHECK: Are we in "Update Mode" for a Campus View?
        // CHECK: Are we in "Update Mode" for a Campus View?
        if (location.state?.allCampusConfigs) {
            const allConfigs = [...location.state.allCampusConfigs];

            // Find index of the config we are editing (Year + Section match)
            // Debug: Ensure types match (string vs string)
            const idx = allConfigs.findIndex(c =>
                String(c.year) === String(currentConfig.year) &&
                String(c.section) === String(currentConfig.section)
            );

            if (idx !== -1) {
                allConfigs[idx] = currentConfig; // Update with new settings
            } else {
                console.warn("Could not find matching config to update:", currentConfig);
                alert(`Error: Could not sync changes back to Campus View. \nTarget: ${currentConfig.year} - ${currentConfig.section}\nAvailable: ${allConfigs.map(c => `${c.year}-${c.section}`).join(', ')}`);
                // Fallback: Don't navigate or navigate as single?
                // Better to navigate as single so user doesn't lose data
                navigate('/timetable', { state: { config: currentConfig } });
                setIsGenerating(false);
                return;
            }

            // Sync latest global subject data across all configs to prevent staff/rules desync
            allConfigs.forEach(c => c.allSubjectsData = allSubjectData);

            // Return with ALL configs (one updated)
            navigate('/timetable', {
                state: {
                    configs: allConfigs,
                    viewMode: 'CAMPUS'
                }
            });
        } else {
            // Standard Single Generation
            navigate('/timetable', {
                state: {
                    config: currentConfig
                }
            });
        }
        setIsGenerating(false);
    };

    // If not HOD, show simple view
    if (!isHOD) {
        return (
            <div className="min-h-screen bg-brand-light p-8 font-sans">
                <div className="max-w-4xl mx-auto text-center pt-20">
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-20 h-20 bg-blue-50 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6">
                            <Calendar className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-4">Welcome, {user?.name || 'Guest'}</h1>
                        <p className="text-slate-500 mb-8 max-w-lg mx-auto">
                            You have view-only access to the timetable system. Please navigate to the Timetable page to view the current schedule.
                        </p>
                        <button
                            onClick={() => navigate('/timetable')}
                            className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-dark transition-colors shadow-lg shadow-blue-200"
                        >
                            View Timetable
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleGenerateAll = async () => {
        if (selectedSubjects.length === 0) return;
        setIsGenerating(true);

        // Refresh Global Usage Map from Cloud
        try {
            await rebuildGlobalUsageMaps();
        } catch (e) {
            console.error("Conflict Sync Warning:", e);
        }

        await new Promise(r => setTimeout(r, 1200));

        const sections = ['A', 'B', 'C'];
        const configs = sections.map(sec => ({
            year: selectedYear,
            semester: selectedSemester,
            section: sec,
            subjects: selectedSubjects,
            allSubjectsData: allSubjectData
        }));

        navigate('/timetable', {
            state: { configs }
        });
        setIsGenerating(false);
    };

    // HOD Dashboard
    return (
        <div className="min-h-screen bg-brand-light p-6 font-sans pb-24 text-slate-800">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Timetable Generator</h1>
                    <p className="text-slate-500 mt-2">Configure academic parameters and generate conflict-free schedules.</p>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Context Selector */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">1. Academic Context</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none"
                                >
                                    {Object.keys(allSubjectData).map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                                <select
                                    value={selectedSemester}
                                    onChange={(e) => setSelectedSemester(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none"
                                >
                                    {allSubjectData[selectedYear] && Object.keys(allSubjectData[selectedYear]).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                                <select
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none"
                                >
                                    {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="pt-2 border-t border-slate-100 mt-2">
                                <button
                                    onClick={() => {
                                        if (window.confirm('Clear all global staff and lab constraints? (Use this if you want to start all sections fresh)')) {
                                            localStorage.removeItem('timetable_global_staff_usage');
                                            localStorage.removeItem('timetable_global_subject_usage');
                                            alert('Global constraints reset!');
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Reset Conflict Constraints
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subject Adder */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">2. Add Subjects</h2>
                    <div className="relative">
                        <select
                            onChange={(e) => {
                                handleAddSubject(e.target.value);
                                e.target.value = ''; // Reset
                            }}
                            className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none appearance-none"
                        >
                            <option value="">Select a subject to add...</option>
                            {availSubjects.map(sub => (
                                <option
                                    key={sub.code}
                                    value={sub.code}
                                    disabled={selectedSubjects.some(s => s.code === sub.code)}
                                >
                                    {sub.code} - {sub.name} {sub.category === 'honour' ? '(HONOUR)' : ''}
                                </option>
                            ))}
                        </select>
                        <Plus className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-right">
                        {selectedSubjects.length} / 30 selected
                    </p>
                </div>

                {/* Generate Action */}
                <div className="bg-gradient-to-br from-brand-primary to-brand-dark p-6 rounded-xl shadow-lg text-white">
                    <h2 className="text-lg font-bold mb-2">
                        {location.state?.editConfig ? 'Update Timetable' : 'Ready to Generate?'}
                    </h2>
                    <p className="text-blue-100 text-sm mb-6">
                        {location.state?.editConfig
                            ? `Updating ${location.state.editConfig.year} - Section ${location.state.editConfig.section}`
                            : 'Ensure all constraints and fixed slots are set correctly before generating.'
                        }
                    </p>

                    {location.state?.editConfig ? (
                        <div className="flex gap-3">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || selectedSubjects.length === 0}
                                className={`flex-1 py-4 bg-brand-accent text-brand-dark font-bold rounded-lg shadow-lg hover:bg-yellow-400 transition-all flex items-center justify-center gap-2
                                        ${isGenerating ? 'opacity-80 cursor-wait' : ''}
                                    `}
                            >
                                {isGenerating ? (
                                    <RefreshCcw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <RefreshCcw className="w-5 h-5" />
                                )}
                                Update Timetable
                            </button>

                            <button
                                onClick={() => navigate('/subjects', {
                                    state: {
                                        ...location.state, // Preserve Edit Mode Context (editConfig, allCampusConfigs)
                                        autoOpenAdd: true,
                                        year: selectedYear,
                                        semester: selectedSemester,
                                        section: selectedSection,
                                        fromGenerator: true
                                    }
                                })}
                                className="flex-1 py-4 bg-white/20 border border-white/30 text-white font-bold rounded-lg hover:bg-white/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Add Subject
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || selectedSubjects.length === 0}
                                className={`w-full py-4 bg-brand-accent text-brand-dark font-bold rounded-lg shadow-lg hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 mb-3
                                        ${isGenerating ? 'opacity-80 cursor-wait' : ''}
                                        ${(selectedSubjects.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCcw className="w-5 h-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5 fill-current" />
                                        Generate Timetable
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleGenerateAll}
                                disabled={isGenerating || selectedSubjects.length === 0}
                                className={`w-full py-3 bg-white/10 border border-white/20 text-white font-bold rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2
                                        ${isGenerating ? 'opacity-50 cursor-wait' : ''}
                                    `}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Generate Batch (A, B, C)
                            </button>
                        </>
                    )}
                </div>

                {/* Campus View Generation */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">3. Campus View</h2>

                    <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                        <button
                            onClick={() => setSemesterType('ODD')}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${semesterType === 'ODD' ? 'bg-white shadow text-brand-primary' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            ODD (1, 3, 5, 7)
                        </button>
                        <button
                            onClick={() => setSemesterType('EVEN')}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${semesterType === 'EVEN' ? 'bg-white shadow text-brand-primary' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            EVEN (2, 4, 6, 8)
                        </button>
                    </div>

                    <button
                        onClick={async () => {
                            setIsGenerating(true);
                            await new Promise(r => setTimeout(r, 2500)); // Processing simulation

                            // 1. Identify Target Semesters
                            // Mapping: Year Index -> Semester Name
                            // I Year -> Sem 1/2
                            // II Year -> Sem 3/4
                            // III Year -> Sem 5/6
                            // IV Year -> Sem 7/8
                            const years = ['I CSE', 'II CSE', 'III CSE', 'IV CSE'];
                            const sections = ['A', 'B', 'C'];
                            let campusConfigs = [];

                            years.forEach((year, idx) => {
                                // Calculate Semester Number: (YearIndex * 2) + (Odd? 1 : 2)
                                // I (idx 0) -> Odd: 1, Even: 2
                                const semNum = (idx * 2) + (semesterType === 'ODD' ? 1 : 2);
                                const semName = `Semester ${semNum}`;

                                // Check if data exists
                                const semData = allSubjectData[year]?.[semName];
                                if (semData) {
                                    // Collect Default Subjects + Honors
                                    const subjects = [
                                        ...(semData.subjects || []),
                                        ...(semData.honors || [])
                                    ];

                                    if (subjects.length > 0) {
                                        sections.forEach(sec => {
                                            campusConfigs.push({
                                                year: year,
                                                semester: semName,
                                                section: sec,
                                                subjects: subjects, // Use ALL subjects for that sem
                                                allSubjectsData: allSubjectData
                                            });
                                        });
                                    }
                                }
                            });

                            if (campusConfigs.length === 0) {
                                alert(`No data found for ${semesterType} semesters. Please ensure subjects are added in the Subjects page.`);
                                setIsGenerating(false);
                                return;
                            }

                            navigate('/timetable', {
                                state: { configs: campusConfigs, viewMode: 'CAMPUS' }
                            });
                            setIsGenerating(false);
                        }}
                        disabled={isGenerating}
                        className={`w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold rounded-xl shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2
                                ${isGenerating ? 'opacity-80 cursor-wait' : ''}
                            `}
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCcw className="w-5 h-5 animate-spin" />
                                Generating Entire Campus...
                            </>
                        ) : (
                            <>
                                <LayoutGrid className="w-5 h-5" />
                                Generate Campus View
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column: Selected Subjects List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-brand-primary" />
                                Selected Configuration
                            </h2>
                            <span className="bg-blue-100 text-brand-primary text-xs font-bold px-3 py-1 rounded-full uppercase">
                                {selectedSubjects.length} Items
                            </span>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            {selectedSubjects.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl p-12">
                                    <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No subjects selected</p>
                                    <p className="text-sm">Add subjects from the dropdown to begin configuration.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {selectedSubjects.map((item, index) => {
                                            const subDetails = availSubjects.find(s => s.code === item.code);
                                            return (
                                                <motion.div
                                                    key={item.code}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-brand-primary/30 transition-all"
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        {/* Subject Info */}
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className="bg-slate-100 text-slate-600 font-mono text-xs font-bold px-2 py-1 rounded">
                                                                    {item.code}
                                                                </span>
                                                                <h3 className="font-bold text-slate-800 text-sm md:text-base">
                                                                    {subDetails?.name}
                                                                </h3>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs text-slate-500 pl-1">
                                                                <span className="flex items-center gap-1">
                                                                    {subDetails?.category === 'honour' ? (
                                                                        <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-amber-200 uppercase">Honour</span>
                                                                    ) : (
                                                                        <span className="bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded text-[10px] border border-slate-200 uppercase">Normal</span>
                                                                    )}
                                                                </span>
                                                                <span>•</span>
                                                                <span>{subDetails?.academicRule?.periodsPerWeek} periods/week</span>
                                                                <span>•</span>
                                                                <span>{subDetails?.type}</span>
                                                            </div>
                                                            {(subDetails?.academicRule?.periodsPerWeek || 0) < 1 && (
                                                                <div className="mt-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded border border-red-200 flex items-center gap-1 animate-pulse">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    0 Periods - Will not generate!
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Fixed Slot Override Controls */}
                                                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fixed Day?</label>
                                                                <select
                                                                    value={item.fixedDay}
                                                                    onChange={(e) => handleUpdateFixedSlot(item.code, 'fixedDay', e.target.value)}
                                                                    className="bg-white border border-slate-200 text-xs rounded p-1.5 focus:ring-1 focus:ring-brand-primary outline-none min-w-[100px]"
                                                                >
                                                                    <option value="">Any Day</option>
                                                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                                                                        <option key={d} value={d}>{d}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Which Period?</label>
                                                                <select
                                                                    value={item.fixedSlot}
                                                                    onChange={(e) => handleUpdateFixedSlot(item.code, 'fixedSlot', parseInt(e.target.value) || '')}
                                                                    className="bg-white border border-slate-200 text-xs rounded p-1.5 focus:ring-1 focus:ring-brand-primary outline-none min-w-[80px]"
                                                                >
                                                                    <option value="">Any</option>
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                                                                        <option key={p} value={p}>{p}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="flex flex-col border-l border-slate-200 pl-3">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mode</label>
                                                                <div className="flex items-center gap-2">
                                                                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`type-${item.code}`}
                                                                            checked={item.periodType !== 'continuous'}
                                                                            onChange={() => handleUpdateFixedSlot(item.code, 'periodType', 'non-continuous')}
                                                                            className="accent-brand-primary"
                                                                        />
                                                                        <span>Split</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`type-${item.code}`}
                                                                            checked={item.periodType === 'continuous'}
                                                                            onChange={() => handleUpdateFixedSlot(item.code, 'periodType', 'continuous')}
                                                                            className="accent-brand-primary"
                                                                        />
                                                                        <span>Cont.</span>
                                                                    </label>
                                                                </div>
                                                            </div>

                                                            {item.periodType === 'continuous' && (
                                                                <div className="flex flex-col">
                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Block</label>
                                                                    <select
                                                                        value={item.continuousCount || 2}
                                                                        onChange={(e) => handleUpdateFixedSlot(item.code, 'continuousCount', parseInt(e.target.value))}
                                                                        className="bg-white border border-slate-200 text-xs rounded p-1.5 focus:ring-1 focus:ring-brand-primary outline-none"
                                                                    >
                                                                        <option value={2}>2 Hrs</option>
                                                                        <option value={3}>3 Hrs</option>
                                                                        <option value={4}>4 Hrs</option>
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => handleRemoveSubject(item.code)}
                                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                            title="Remove Subject"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
