import React, { useState, useEffect } from 'react';
import { fetchLatestStaff, saveStaffList, fetchTimetableHistory, fetchUnifiedSubjectData } from '../utils/dataStore';
import { getSectionStaff } from '../utils/timetableGenerator';
import { Mail, GraduationCap, User, Plus, Trash2, Edit2, X, Save, CalendarDays, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';

const StaffProfiles = () => {
    const { isHOD } = useUser();

    // State for staff list
    const [staffList, setStaffList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            const data = await fetchLatestStaff();
            setStaffList(data);
            setIsLoading(false);
        };
        load();
    }, []);

    // Persist changes helper
    const persistStaffChange = async (newList) => {
        setStaffList(newList);
        try {
            const result = await saveStaffList(newList);
            if (!result.success) {
                alert("CRITICAL ERROR: Failed to save staff profiles. Changes may be lost on refresh.");
            } else if (result.mode === 'offline') {
                console.warn("Saved locally only. Cloud sync failed.");
            }
        } catch (e) {
            alert("Failed to sync staff to cloud.");
        }
    };

    // Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [formData, setFormData] = useState({ name: '', designation: '', qualification: '', email: '', image: '' });

    // Personal Timetable Extracter States
    const [viewingScheduleFor, setViewingScheduleFor] = useState(null);
    const [personalSchedule, setPersonalSchedule] = useState(null);
    const [isExtractingSchedule, setIsExtractingSchedule] = useState(false);

    const handleEdit = (staff) => {
        setEditingStaff(staff);
        setFormData({
            name: staff.name,
            designation: staff.designation,
            qualification: staff.qualification,
            email: staff.email,
            image: staff.image || ''
        });
        setIsEditModalOpen(true);
    };

    const handleAdd = () => {
        setEditingStaff(null);
        setFormData({ name: '', designation: '', qualification: '', email: '', image: '' });
        setIsEditModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this staff member?')) {
            persistStaffChange(staffList.filter(s => s.id !== id));
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Image size should be less than 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let newList;
        if (editingStaff) {
            newList = staffList.map(s => s.id === editingStaff.id ? { ...s, ...formData } : s);
        } else {
            const newStaff = { id: Date.now(), ...formData };
            newList = [...staffList, newStaff];
        }
        persistStaffChange(newList);
        setIsEditModalOpen(false);
    };

    // --- Dynamic Schedule Extraction Algorithm ---
    const handleViewSchedule = async (staff) => {
        setViewingScheduleFor(staff);
        setIsExtractingSchedule(true);
        setPersonalSchedule(null);

        try {
            const allPublished = await fetchTimetableHistory(true); // Gets LIVE timetables
            const allSubjects = await fetchUnifiedSubjectData();
            
            const scheduleData = {
                'Monday': {}, 'Tuesday': {}, 'Wednesday': {}, 'Thursday': {}, 'Friday': {}, 'Saturday': {}
            };

            let classesFoundCount = 0;

            allPublished.forEach(tt => {
                // To avoid reading corrupt or undefined configs
                if (!tt.config || !tt.config.year || !tt.config.semester || !tt.config.section) return;

                const { year, semester, section } = tt.config;
                const semData = allSubjects[year]?.[semester];
                if (!semData) return;

                const activeSubjects = [...(semData.subjects || []), ...(semData.honors || [])];

                Object.entries(tt.timetable).forEach(([day, slots]) => {
                    slots.forEach(slot => {
                        const targetSubject = activeSubjects.find(s => s.code === slot.code);
                        if (targetSubject && targetSubject.staffConfig) {
                            // Extract who teaches THIS class for THIS section
                            const assignedStaffNames = getSectionStaff(targetSubject.staffConfig, section);
                            
                            // If this staff member's name is in the resulting list, map to schedule!
                            if (assignedStaffNames.includes(staff.name)) {
                                scheduleData[day][slot.slot] = {
                                    code: targetSubject.code,
                                    name: targetSubject.name,
                                    classRef: `${year} - Sect ${section}`
                                };
                                classesFoundCount++;
                            }
                        }
                    });
                });
            });

            setTimeout(() => {
                setPersonalSchedule({ grid: scheduleData, totalFound: classesFoundCount });
                setIsExtractingSchedule(false);
            }, 600); // Slight delay for smooth visual transition

        } catch (error) {
            console.error("Failed to extract personal timetable:", error);
            setIsExtractingSchedule(false);
            alert("Could not pull live timetables from the generator framework.");
        }
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <div className="min-h-screen bg-brand-light font-sans relative">

            <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
                    <div className="text-center md:text-left">
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                                Academic Faculty Profile Base
                            </h1>
                            <p className="text-slate-500 font-semibold mt-2">Personalized schedules continuously tethered to the live Timetable Generator DB.</p>
                        </motion.div>
                    </div>

                    {isHOD && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAdd} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white px-6 py-3.5 rounded-full font-bold shadow-xl shadow-fuchsia-500/20 flex items-center gap-2 transition-colors">
                            <Plus className="w-5 h-5" /> Add Faculty Profile
                        </motion.button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-bold">Connecting to Master Database...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <AnimatePresence>
                            {staffList.map((staff) => (
                                <motion.div
                                    key={staff.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}
                                    className="bg-white/70 backdrop-blur-3xl rounded-[2rem] shadow-sm border border-slate-100 p-5 flex flex-col md:flex-row items-center md:items-start gap-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative"
                                >
                                    {isHOD && (
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button onClick={() => handleEdit(staff)} className="p-2.5 bg-slate-100 hover:bg-brand-secondary text-slate-600 rounded-full transition-colors shadow-sm"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(staff.id)} className="p-2.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-colors shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    )}

                                    <div className="flex-shrink-0 mt-2">
                                        <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden shadow-inner ring-4 ring-white group-hover:ring-violet-200 transition-all">
                                            {staff.image ? (
                                                <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <User className="w-12 h-12" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 text-center md:text-left pt-2">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black text-violet-700 bg-violet-100 uppercase tracking-widest shadow-sm mb-3 border border-violet-200">
                                            {staff.designation}
                                        </span>
                                        <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-violet-600 transition-colors">
                                            {staff.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
                                            {staff.qualification}
                                        </p>
                                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 w-full">
                                            <a href={`mailto:${staff.email}`} className="text-xs text-slate-400 hover:text-violet-500 flex items-center gap-1.5 transition-colors bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                                <Mail className="w-3.5 h-3.5" /> <span className="truncate max-w-[120px]">{staff.email}</span>
                                            </a>
                                            <button 
                                                onClick={() => handleViewSchedule(staff)}
                                                className="text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-fuchsia-500/20 hover:scale-105 transition-all uppercase tracking-wide"
                                            >
                                                <CalendarDays className="w-3.5 h-3.5" /> My Schedule
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* --- THE PERSONALIZED FACULTY TIMETABLE MODAL --- */}
            <AnimatePresence>
                {viewingScheduleFor && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingScheduleFor(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></motion.div>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl relative z-10 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                            
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-violet-900 to-fuchsia-900 p-6 md:p-8 text-white flex justify-between items-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[80px] pointer-events-none"></div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                        <LayoutGrid className="w-7 h-7 text-fuchsia-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-extrabold tracking-tight">Active Duty Roster</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-violet-300 font-medium text-sm">{viewingScheduleFor.name}</span>
                                            <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full"></span>
                                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest text-emerald-400">Live Linked to Generator</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setViewingScheduleFor(null)} className="hover:bg-white/10 p-3 rounded-full transition-colors relative z-10 bg-white/5 border border-white/10">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 md:p-8 flex-1 overflow-auto bg-slate-50/50">
                                {isExtractingSchedule ? (
                                    <div className="py-24 flex flex-col items-center justify-center">
                                        <div className="opacity-50 text-6xl mb-6 animate-pulse">📡</div>
                                        <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 w-1/2 animate-[slide_1s_ease-in-out_infinite_alternate]"></div>
                                        </div>
                                        <h3 className="text-slate-800 font-extrabold text-xl mt-6">Extracting Global Mappings</h3>
                                        <p className="text-slate-500 font-medium text-sm mt-1">Scanning all published Class Sections for '{viewingScheduleFor.name}'...</p>
                                    </div>
                                ) : personalSchedule ? (
                                    <>
                                        {personalSchedule.totalFound === 0 ? (
                                            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                                <div className="text-5xl mb-4">📭</div>
                                                <h3 className="text-slate-800 font-extrabold text-xl">No Classes Assigned</h3>
                                                <p className="text-slate-500 max-w-md mx-auto mt-2">This faculty member current does not have any active subjects mapped in the Live Published timetables for any year or section.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto pb-4">
                                                <div className="inline-flex items-center gap-2 mb-6 bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 border border-slate-200">
                                                    Total Weekly Classes Handled: <span className="text-fuchsia-600 bg-fuchsia-100 px-2 py-0.5 rounded-lg border border-fuchsia-200">{personalSchedule.totalFound} periods</span>
                                                </div>
                                                <table className="w-full border-collapse min-w-[1000px]">
                                                    <thead>
                                                        <tr>
                                                            <th className="p-4 bg-white border-2 border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-xs rounded-tl-2xl w-32 shadow-sm text-left">Day</th>
                                                            {timeSlots.map(s => <th key={s} className="p-4 bg-white border-2 border-slate-100 text-slate-800 font-black text-sm shadow-sm">{s}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {days.map(day => (
                                                            <tr key={day} className="group">
                                                                <td className="p-4 font-extrabold bg-white border border-slate-100 text-slate-700 shadow-sm group-hover:bg-slate-50 transition-colors uppercase tracking-wider text-sm">{day.substring(0,3)}</td>
                                                                {timeSlots.map(slotId => {
                                                                    const block = personalSchedule.grid[day][slotId];
                                                                    return (
                                                                        <td key={slotId} className="p-2 border border-slate-100 h-24 align-middle bg-white group-hover:bg-slate-50 transition-colors min-w-[120px]">
                                                                            {block ? (
                                                                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-full w-full rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 shadow-sm p-3 flex flex-col justify-center items-center text-center relative overflow-hidden group/card hover:shadow-md hover:border-fuchsia-200 transition-all cursor-crosshair">
                                                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/40 blur-xl rounded-full"></div>
                                                                                    <span className="font-black text-slate-800 text-base leading-none mb-1 z-10">{block.code}</span>
                                                                                    <span className="text-[9px] font-extrabold text-fuchsia-600 uppercase tracking-widest z-10 bg-white/80 px-2 py-0.5 rounded-full border border-fuchsia-100 line-clamp-1">{block.classRef}</span>
                                                                                </motion.div>
                                                                            ) : (
                                                                                <div className="h-full flex items-center justify-center text-slate-200 font-bold bg-slate-50/50 rounded-2xl border border-slate-50">-</div>
                                                                            )}
                                                                        </td>
                                                                    )
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Profile Edit Modal */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></motion.div>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden border border-slate-100">
                            <div className="bg-gradient-to-r from-violet-900 to-fuchsia-900 p-6 text-white flex justify-between items-center">
                                <h2 className="text-xl font-bold">{editingStaff ? 'Update Faculty Credentials' : 'New Faculty Injection'}</h2>
                                <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-white/20 p-2 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                                        {formData.image ? <img src={formData.image} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><User className="w-8 h-8" /></div>}
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Portrait</label>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-violet-600 file:text-white hover:file:bg-fuchsia-500 transition-colors" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name (Matching Database Entity)</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-semibold" placeholder="e.g. Asir" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Designation</label><input type="text" required value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-semibold" placeholder="Professor" /></div>
                                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Qualification</label><input type="text" required value={formData.qualification} onChange={e => setFormData({ ...formData, qualification: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-semibold" placeholder="M.Tech" /></div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Contact Email</label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-semibold" placeholder="asir@college.edu" />
                                </div>
                                <div className="pt-6 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                                    <button type="submit" className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 shadow-xl shadow-fuchsia-500/20 transition-all flex items-center gap-2">Execute Overwrite</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default StaffProfiles;
