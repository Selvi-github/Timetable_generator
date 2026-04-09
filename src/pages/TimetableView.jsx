import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RefreshCcw, ArrowLeft, Download, Check, History as HistoryIcon, X, AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { generateTimetable, getSectionStaff } from '../utils/timetableGenerator';
import { saveTimetable, saveTimetableBatch, fetchLatestTimetable, fetchTimetableHistory, fetchTimetableById, fetchUnifiedSubjectData, getUnifiedSubjectData } from '../utils/dataStore';
import { exportTimetablePDF } from '../utils/pdfGenerator';
import Toast from '../components/Toast';

const TimetableView = () => {
    const { isHOD } = useUser();
    const location = useLocation();
    const navigate = useNavigate();

    // State for Multiple Timetables
    const [timetables, setTimetables] = useState([]);

    // Track Saved IDs
    const [savedIds, setSavedIds] = useState({});
    const savedIdsRef = useRef({});

    const [timetable, setTimetable] = useState(null);
    const [config, setConfig] = useState({ year: '', semester: '', section: '', subjects: [] });
    const [viewMode, setViewMode] = useState('SINGLE');
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [allSubjectData, setAllSubjectData] = useState({});

    // History State
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // Toast State
    const [toast, setToast] = useState({ message: null, type: 'success' });

    useEffect(() => {
        // Load History
        const loadHistory = async () => {
            const data = await fetchTimetableHistory(!isHOD);
            if (Array.isArray(data)) setHistory(data);
        };
        loadHistory();

        // Load latest subject data for dynamic staff resolution
        const loadSubjectData = async () => {
            setAllSubjectData(getUnifiedSubjectData());
            const fresh = await fetchUnifiedSubjectData();
            setAllSubjectData(fresh);
        };
        loadSubjectData();

        // 1. Batch Mode / Campus Mode
        if (location.state?.configs) {
            try {
                setError(null);
                const mode = location.state.viewMode || 'BATCH';
                setViewMode(mode);

                const results = location.state.configs.map(conf => {
                    const injectedData = conf.allSubjectsData || null;
                    const result = generateTimetable({
                        year: conf.year,
                        semester: conf.semester,
                        section: conf.section,
                        subjects: conf.subjects
                    }, injectedData);

                    return {
                        config: conf,
                        timetable: result.timetable,
                        staffMapping: result.staffMapping || [],
                        resultObj: result
                    };
                });

                setTimetables(results);
                setConfig(results[0].config);

            } catch (err) {
                console.error(err);
                setError("Generation Failed: " + err.message);
            }
        }
        // 2. Single Mode
        else if (location.state?.config) {
            try {
                setViewMode('SINGLE');
                const conf = location.state.config;
                setConfig(conf);
                setError(null);
                const injectedData = conf.allSubjectsData || null;
                const result = generateTimetable({
                    year: conf.year,
                    semester: conf.semester,
                    section: conf.section,
                    subjects: conf.subjects
                }, injectedData);

                setTimetables([{
                    config: conf,
                    timetable: result.timetable,
                    staffMapping: result.staffMapping || []
                }]);

            } catch (err) {
                console.error(err);
                setError(err.message);
            }
        }
        // 3. Load from Latest Saved (Fallback)
        else {
            const loadSaved = async () => {
                const savedData = await fetchLatestTimetable(!isHOD);
                if (savedData) {
                    setConfig(savedData.config);
                    setTimetables([{
                        config: savedData.config,
                        timetable: savedData.timetable,
                        staffMapping: []
                    }]);
                    if (savedData._id) {
                        setSavedIds({ 0: savedData._id });
                        savedIdsRef.current = { 0: savedData._id };
                    }
                }
            };
            loadSaved();
        }

        const handleUpdate = () => {
            setAllSubjectData(getUnifiedSubjectData());
        };
        window.addEventListener('subjectDataUpdated', handleUpdate);

        return () => {
            window.removeEventListener('subjectDataUpdated', handleUpdate);
        };
    }, [location.state, navigate, isHOD]);

    const isConfigOutdated = (conf, currentData) => {
        if (!conf || !conf.subjects || !currentData) return false;
        const semData = currentData[conf.year]?.[conf.semester];
        if (!semData) return false;
        const allCurrentSubjects = [...(semData.subjects || []), ...(semData.honors || [])];

        return conf.subjects.some(savedSub => {
            const currentSub = allCurrentSubjects.find(s => s.code === savedSub.code);
            if (!currentSub) return true; // Subject deleted or code changed

            // 1. Check Periods (Structural)
            const getP = (s) => s.academicRule?.periodsPerWeek || s.academicRule?.periods_per_week || s.periodsPerWeek || s.periods_per_week || 0;
            if (getP(savedSub) !== getP(currentSub)) return true;

            // 2. Check Name (Metadata)
            if (savedSub.name !== currentSub.name) return true;

            // 3. Check Staff Config (Metadata) - Deep Compare
            if (JSON.stringify(savedSub.staffConfig) !== JSON.stringify(currentSub.staffConfig)) return true;

            return false;
        });
    };

    const hasOutdatedTables = useMemo(() => {
        return timetables.some(tt => isConfigOutdated(tt.config, allSubjectData));
    }, [timetables, allSubjectData]);

    const handleBack = () => {
        navigate('/dashboard');
    };

    const handleRegenerate = () => {
        try {
            setError(null);
            const newResults = timetables.map(item => {
                const semData = allSubjectData[item.config.year]?.[item.config.semester];
                const allLatest = [...(semData?.subjects || []), ...(semData?.honors || [])];
                const updatedSubjects = item.config.subjects.map(s => {
                    const latest = allLatest.find(l => l.code === s.code);
                    if (!latest) return s;
                    return {
                        ...latest,
                        ...s,
                        academicRule: { ...latest.academicRule },
                        staffConfig: { ...latest.staffConfig }
                    };
                });
                const updatedConfig = { ...item.config, subjects: updatedSubjects };
                const result = generateTimetable(updatedConfig, allSubjectData);
                return {
                    config: updatedConfig,
                    timetable: result.timetable,
                    staffMapping: result.staffMapping || []
                };
            });
            setTimetables(newResults);

            const reSave = async () => {
                const newIds = { ...savedIds };
                for (let i = 0; i < newResults.length; i++) {
                    const existingId = savedIds[i];
                    const saveRes = await saveTimetable(newResults[i].config, newResults[i].timetable, existingId);
                    if (saveRes._id) newIds[i] = saveRes._id;
                }
                setSavedIds(newIds);
                savedIdsRef.current = newIds;
                await fetchTimetableHistory().then(d => Array.isArray(d) && setHistory(d));
                setToast({ message: "All timetables updated and synced successfully!", type: 'success' });
            };
            reSave();

        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    const handleSave = async (publish = false) => {
        setIsSaving(true);
        try {
            const currentIds = { ...savedIdsRef.current };
            const batchItems = timetables.map((tt, i) => ({
                config: tt.config,
                timetable: tt.timetable,
                _id: currentIds[i],
                isPublished: publish
            }));

            const res = await saveTimetableBatch(batchItems, publish);

            if (res.success) {
                const newIds = { ...currentIds };
                res.results.forEach((r, idx) => {
                    newIds[idx] = r._id;
                });
                setSavedIds(newIds);
                savedIdsRef.current = newIds;

                setToast({
                    message: `Success! ${timetables.length} timetables ${publish ? 'PUBLISHED LIVE' : 'saved as drafts'}.`,
                    type: 'success'
                });
            }

            const data = await fetchTimetableHistory();
            if (Array.isArray(data)) setHistory(data);
        } catch (e) {
            setToast({
                message: `Save Failed: ${e.message}`,
                type: 'error'
            });
            console.error(e);
        }
        setIsSaving(false);
    };

    const handleLoadHistoryItem = async (id) => {
        const data = await fetchTimetableById(id);
        if (data) {
            setConfig(data.config);
            setTimetables([{
                config: data.config,
                timetable: data.timetable,
                staffMapping: []
            }]);
            setShowHistory(false);
        }
    };

    const handleDownload = () => {
        const tt = timetables[0];
        if (!tt) return;

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const slots = [1, 2, 3, 4, 5, 6, 7, 8];
        let csvContent = "Time/Day," + days.join(",") + "\n";
        slots.forEach(slotId => {
            let row = `Period ${slotId}`;
            days.forEach(day => {
                const sub = tt.timetable[day]?.find(s => s.slot === slotId);
                row += `,${sub ? `${sub.code} (${sub.name})` : '-'}`;
            });
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `timetable_${tt.config.year}_${tt.config.section}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const timeSlots = [
        { id: 1, time: '09:10 - 10:00', label: '1' },
        { id: 2, time: '10:00 - 10:50', label: '2' },
        { id: 'interval', time: '10:50 - 11:10', label: 'Break' },
        { id: 3, time: '11:10 - 12:00', label: '3' },
        { id: 4, time: '12:00 - 12:50', label: '4' },
        { id: 'lunch', time: '12:50 - 01:30', label: 'Lunch' },
        { id: 5, time: '01:30 - 02:15', label: '5' },
        { id: 6, time: '02:15 - 03:00', label: '6' },
        { id: 7, time: '03:00 - 03:40', label: '7' },
        { id: 8, time: '03:40 - 04:20', label: '8' },
    ];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const getSlotData = (timetable, day, slotId) => {
        if (!timetable || !timetable[day]) return null;
        return timetable[day].find(s => s.slot === slotId);
    };

    const getPastelColor = (dayIndex) => {
        const subjectColors = [
            'bg-violet-50 border-violet-200', 'bg-fuchsia-50 border-fuchsia-200',
            'bg-purple-50 border-purple-200', 'bg-pink-50 border-pink-200',
            'bg-indigo-50 border-indigo-200', 'bg-slate-50 border-slate-200'
        ];
        return subjectColors[dayIndex % subjectColors.length];
    };

    const resolveStaffName = (subjectCode, year, semester, section) => {
        if (subjectCode === 'GEAR') return 'Coordinator';
        if (subjectCode === 'COUN') return 'Counselling Team';
        if (subjectCode === 'LIB') return 'Librarian';
        if (subjectCode === 'PT') return 'Physical Instructor';
        if (subjectCode === 'APT') return 'Aptitude Trainer';

        const semData = allSubjectData[year]?.[semester];
        if (!semData) return 'TBD';
        const allSubjects = [...(semData.subjects || []), ...(semData.honors || [])];
        const sub = allSubjects.find(s => s.code === subjectCode);
        if (!sub) return 'TBD';
        const assigned = getSectionStaff(sub.staffConfig, section);
        return assigned.length > 0 ? assigned.join(' & ') : 'TBD';
    };

    const handleEditTimetable = (ttConfig) => {
        // Ensure we pass a clean copy of configs
        const allConfigs = timetables.map(t => ({
            ...t.config,
            // Ensure we don't carry over massive data if not needed, but we check matching by Year/Sem/Sec
        }));
        navigate('/generator', {
            state: {
                editConfig: ttConfig,
                allCampusConfigs: allConfigs
            }
        });
    };

    if (timetables.length === 0 && !location.state?.config && !location.state?.configs) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
            <div className="text-slate-400">Loading Latest Timetable...</div>
            <button onClick={handleBack} className="text-brand-primary font-bold">Go to Dashboard</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-light font-sans text-slate-800 pb-20 relative">
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: null })}
            />

            <AnimatePresence>
                {showHistory && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 z-[90] backdrop-blur-sm" onClick={() => setShowHistory(false)}>
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-[100] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex-none p-6 border-b bg-white">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold flex gap-2 text-slate-800"><HistoryIcon /> History ({history.length})</h2>
                                    <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {history.length === 0 && (
                                    <div className="text-center text-slate-400 py-10">No history yet.</div>
                                )}
                                {history.map(item => (
                                    <div key={item._id} onClick={() => handleLoadHistoryItem(item._id)} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md hover:border-brand-primary/30 cursor-pointer transition-all group">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-black text-brand-primary text-lg">{item.config?.year}</div>
                                            <div className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                {item.config?.section}
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-500 flex justify-between items-center">
                                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                            <span className="group-hover:text-brand-primary font-medium">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {item.isPublished && (
                                            <div className="mt-2 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded inline-block">LIVE</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="pt-8 max-w-[1700px] mx-auto px-6">
                <div className="flex items-center justify-between mb-8 sticky top-0 bg-brand-light/90 py-4 z-30 backdrop-blur-sm border-b border-white/50">
                    <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-brand-primary">
                        <ArrowLeft className="w-5 h-5" /> Back to Config
                    </button>
                    <div className="flex items-center gap-3">
                        {viewMode === 'CAMPUS' && (
                            <div className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg uppercase tracking-wider">
                                Campus View
                            </div>
                        )}
                        <button onClick={() => setShowHistory(true)} className="flex gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border font-bold text-sm">
                            <HistoryIcon className="w-4 h-4" /> History
                        </button>
                        {isHOD && (
                            <>
                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={isSaving}
                                    className="flex gap-2 px-6 py-2 bg-violet-100 text-violet-700 rounded-lg font-bold text-sm hover:bg-violet-200 transition-colors"
                                >
                                    <Check className="w-4 h-4" /> Save Draft
                                </button>
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={isSaving}
                                    className="flex gap-2 px-6 py-2 bg-green-600 text-white rounded-lg shadow-md font-bold text-sm hover:bg-green-700 animate-in fade-in zoom-in"
                                >
                                    <Check className="w-4 h-4" /> Publish Live
                                </button>
                                <button onClick={handleRegenerate} className={`flex gap-2 px-6 py-2 rounded-lg shadow-md font-bold text-sm transition-all ${hasOutdatedTables ? 'bg-amber-500 hover:bg-amber-600 animate-pulse' : 'bg-brand-primary hover:bg-brand-dark'} text-white`}>
                                    <RefreshCcw className={`w-4 h-4 ${hasOutdatedTables ? 'animate-spin' : ''}`} />
                                    {hasOutdatedTables ? 'Fix & Update All' : 'Regenerate All'}
                                </button>
                            </>
                        )}
                        <button onClick={() => {
                            if (timetables[0]) exportTimetablePDF(timetables[0].config, timetables[0].timetable, timetables[0].staffMapping);
                        }} className="flex gap-2 px-6 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-lg shadow-md font-bold text-sm hover:opacity-90 transition-colors">
                            <Download className="w-4 h-4" /> Export PDF
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex gap-4">
                        <span className="text-2xl">⚠️</span>
                        <div><h3 className="font-bold">Error</h3><p>{error}</p></div>
                    </div>
                )}

                {hasOutdatedTables && (
                    <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold">Campus Schedule Out of Sync</h3>
                                <p className="text-sm opacity-90">One or more academic rules have changed. Click "Fix & Update All" to synchronize your timetables.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleRegenerate}
                            className="px-6 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-all shadow-md"
                        >
                            Sync All Now
                        </button>
                    </div>
                )}

                {viewMode === 'CAMPUS' ? (
                    <div className="space-y-16">
                        {['I CSE', 'II CSE', 'III CSE', 'IV CSE'].map(year => {
                            const yearTables = timetables.filter(t => t.config.year === year);
                            yearTables.sort((a, b) => a.config.section.localeCompare(b.config.section));
                            if (yearTables.length === 0) return null;

                            return (
                                <div key={year} className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                                    <h2 className="text-3xl font-black text-slate-300 uppercase tracking-tighter mb-8 border-b-4 border-slate-200 inline-block pr-12">
                                        {year} - {yearTables[0].config.semester}
                                    </h2>

                                    <div className="flex flex-col gap-12">
                                        {yearTables.map((tt, idx) => (
                                            <div
                                                key={idx}
                                                className="relative group cursor-pointer"
                                                onClick={() => handleEditTimetable(tt.config)}
                                                title="Click to Edit this Timetable"
                                            >
                                                <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/5 z-20 transition-colors rounded-2xl pointer-events-none" />
                                                <div className="absolute top-4 right-4 z-30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isConfigOutdated(tt.config, allSubjectData) && (
                                                        <div className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black shadow-sm border border-amber-200 flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" /> OUTDATED
                                                        </div>
                                                    )}
                                                    <div className="bg-white text-brand-primary px-3 py-1 rounded-full text-xs font-bold shadow-md">
                                                        Edit Section {tt.config.section}
                                                    </div>
                                                </div>

                                                <div className="text-center mb-4">
                                                    <span className="bg-white border border-slate-200 text-slate-600 px-4 py-1 rounded-full text-sm font-bold shadow-sm">
                                                        Section {tt.config.section}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white text-[10px]">
                                                        <table className="w-full border-collapse table-fixed">
                                                            <thead>
                                                                <tr>
                                                                    <th className="p-1 bg-violet-600 text-white w-8 rounded-tl-lg">Day</th>
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <th key={s} className="p-1 bg-slate-700 text-slate-300">{s}</th>)}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {days.map(day => (
                                                                    <tr key={day}>
                                                                        <td className="p-1 font-bold bg-slate-50 border-b border-2 border-slate-100 text-center h-10">{day.substring(0, 3)}</td>
                                                                        {timeSlots.filter(t => typeof t.id === 'number').map(slot => {
                                                                            const cell = getSlotData(tt.timetable, day, slot.id);
                                                                            return (
                                                                                <td key={slot.id} className="p-0 border border-slate-100 text-center text-[9px] h-10 bg-white align-middle">
                                                                                    {cell ? (
                                                                                        <div className="flex items-center justify-center h-full w-full">
                                                                                            <span className="font-bold text-slate-700 leading-none px-1 break-words">{cell.code}</span>
                                                                                        </div>
                                                                                    ) : <span className="text-slate-200">-</span>}
                                                                                </td>
                                                                            )
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white text-[10px]">
                                                        <table className="w-full border-collapse table-fixed">
                                                            <thead>
                                                                <tr>
                                                                    <th className="p-1 bg-violet-600 text-white w-8 rounded-tl-lg">Day</th>
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <th key={s} className="p-1 bg-brand-primary text-white">{s}</th>)}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {days.map(day => (
                                                                    <tr key={day}>
                                                                        <td className="p-1 font-bold bg-slate-50 border-b border-2 border-slate-100 text-center h-10">{day.substring(0, 3)}</td>
                                                                        {timeSlots.filter(t => typeof t.id === 'number').map(slot => {
                                                                            const cell = getSlotData(tt.timetable, day, slot.id);
                                                                            return (
                                                                                <td key={slot.id} className="p-0 border border-slate-100 text-center text-[8px] h-10 bg-white align-middle">
                                                                                    {cell ? (
                                                                                        <div className="flex items-center justify-center h-full w-full px-0.5 overflow-hidden">
                                                                                            {(() => {
                                                                                                const staff = resolveStaffName(cell.code, tt.config.year, tt.config.semester, tt.config.section);
                                                                                                const isLong = staff.length > 15;
                                                                                                return (
                                                                                                    <span
                                                                                                        className={`font-bold text-brand-primary leading-tight truncate w-full ${isLong ? 'text-[7px]' : 'text-[8px]'}`}
                                                                                                        title={staff}
                                                                                                    >
                                                                                                        {staff === 'TBD' ? <span className="text-red-400">TBD</span> : staff}
                                                                                                    </span>
                                                                                                );
                                                                                            })()}
                                                                                        </div>
                                                                                    ) : <span className="text-slate-200">-</span>}
                                                                                </td>
                                                                            )
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-1 gap-20">
                        {timetables.map((tt, idx) => (
                            <div key={idx} className="relative">
                                <div className="text-center mb-6">
                                    <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">
                                        {tt.config.year} - {tt.config.semester}
                                    </h1>
                                    <div className="flex items-center justify-center gap-3 mt-2">
                                        <div className="inline-block bg-brand-primary text-white px-6 py-1 rounded-full text-lg font-bold uppercase tracking-widest shadow-lg">
                                            Section {tt.config.section}
                                        </div>
                                        {isHOD && (
                                            <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${savedIds[idx] ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-500 border-red-100'}`}>
                                                MANAGE MODE
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl bg-white mb-8">
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[1000px] border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="p-3 bg-brand-dark text-white w-24 border-r border-white/10">Time</th>
                                                    {days.map(day => <th key={day} className="p-3 bg-brand-dark text-white border-l border-white/10">{day}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {timeSlots.map(slot => (
                                                    <tr key={slot.id} className={typeof slot.id === 'string' ? "bg-slate-100/50" : "hover:bg-slate-50"}>
                                                        {typeof slot.id === 'string' ? (
                                                            <>
                                                                <td className="p-2 text-center font-bold text-xs text-slate-400 uppercase">{slot.time}</td>
                                                                <td colSpan={6} className="p-2 text-center text-[10px] font-black tracking-[0.5em] text-slate-300 uppercase">
                                                                    {slot.label === 'Break' ? 'Short Break' : 'Lunch Break'}
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="p-4 border-b border-slate-100 text-center bg-white">
                                                                    <div className="text-lg font-black text-brand-primary">{slot.label}</div>
                                                                    <div className="text-[10px] text-slate-400 font-bold">{slot.time}</div>
                                                                </td>
                                                                {days.map((day, i) => {
                                                                    const cell = getSlotData(tt.timetable, day, slot.id);
                                                                    return (
                                                                        <td key={day} className="p-2 border-b border-l border-slate-100 h-24 align-top w-[14%]">
                                                                            {cell ? (
                                                                                <div className={`h-full w-full rounded-xl p-2 flex flex-col items-center justify-center text-center ${getPastelColor(i)}`}>
                                                                                    <span className="font-black text-slate-800 leading-tight">{cell.code}</span>
                                                                                    <span className="text-[9px] font-bold text-slate-600 uppercase mt-1 leading-tight line-clamp-2">{cell.name}</span>
                                                                                    <span className="text-[9px] font-bold text-brand-primary mt-1">
                                                                                        {resolveStaffName(cell.code, tt.config.year, tt.config.semester, tt.config.section)}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="h-full flex items-center justify-center text-slate-200 font-bold">-</div>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="max-w-4xl mx-auto mt-8">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Staff Allocation for Section {tt.config.section}</h3>
                                    {tt.staffMapping?.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {tt.staffMapping.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                    <div className="font-black text-brand-primary text-sm min-w-[60px]">{item.code}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold text-slate-700 truncate">{item.name}</div>
                                                        <div className="text-xs text-slate-500 font-medium truncate">
                                                            {(() => {
                                                                const staff = resolveStaffName(item.code, tt.config.year, tt.config.semester, tt.config.section);
                                                                return staff === 'TBD' ? <span className="text-red-500">Unassigned</span> : `Prof. ${staff}`;
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                                            No academic subjects assigned yet.
                                        </div>
                                    )}
                                </div>

                                {idx < timetables.length - 1 && (
                                    <div className="my-16 border-t-4 border-dashed border-slate-200" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default TimetableView;
