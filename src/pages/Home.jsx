import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ArrowRight, Table2, BookOpen, Users, Download, ChevronLeft, ChevronRight, Sparkles, Settings, X, Trash2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getAcademicCalendar, saveAcademicCalendar } from '../utils/dataStore';

const CalendarManagerModal = ({ onClose, calendarData, selectedYear, selectedMonth }) => {
    const [localData, setLocalData] = useState(JSON.parse(JSON.stringify(calendarData)));
    const [year, setYear] = useState(selectedYear.toString());
    const [month, setMonth] = useState(selectedMonth);
    const [newEvent, setNewEvent] = useState({ date: '', event: '', isHoliday: false });

    if (!localData[year]) localData[year] = {};
    if (!localData[year][month]) localData[year][month] = { events: [] };

    const events = localData[year][month].events || [];

    const handleSave = async () => {
        await saveAcademicCalendar(localData);
        onClose();
    };

    const handleAdd = () => {
        if (!newEvent.date || !newEvent.event) return;
        localData[year][month].events.push({ ...newEvent });
        localData[year][month].events.sort((a,b) => parseInt(a.date.split('.')[0] || 0) - parseInt(b.date.split('.')[0] || 0));
        setLocalData({...localData});
        setNewEvent({ date: '', event: '', isHoliday: false });
    };

    const handleDelete = (index) => {
        localData[year][month].events.splice(index, 1);
        setLocalData({...localData});
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-violet-600"/> Manage Calendar</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="flex gap-4 mb-6">
                        <select className="flex-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none focus:border-violet-400" value={year} onChange={e=>setYear(e.target.value)}>
                            {['2025','2026', '2027'].map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                        <select className="flex-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none focus:border-violet-400" value={month} onChange={e=>setMonth(e.target.value)}>
                            {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m=><option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3 mb-8">
                        <h3 className="font-bold text-slate-700">Events for {month} {year}</h3>
                        {events.length === 0 && <p className="text-slate-400 text-sm italic">No events scheduled.</p>}
                        {events.map((evt, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 bg-slate-50 shadow-sm">
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{evt.date} - {evt.event}</div>
                                    <div className={`text-xs mt-1 ${evt.isHoliday ? 'text-red-500 font-bold' : 'text-blue-500'}`}>{evt.isHoliday ? 'Holiday' : 'Working Day'}</div>
                                </div>
                                <button onClick={() => handleDelete(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>

                    <div className="p-5 rounded-2xl border border-violet-100 bg-violet-50/50 shadow-inner">
                        <h4 className="font-bold text-violet-800 text-sm mb-4">Add New Event</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <input type="text" placeholder="Date (e.g. 15.08.2026)" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} className="p-3 text-sm rounded-xl border border-violet-200 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400" />
                            <input type="text" placeholder="Title (e.g. Independence Day)" value={newEvent.event} onChange={e=>setNewEvent({...newEvent, event: e.target.value})} className="p-3 text-sm rounded-xl border border-violet-200 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400" />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={newEvent.isHoliday} onChange={e=>setNewEvent({...newEvent, isHoliday: e.target.checked})} className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300" />
                                Mark as Holiday
                            </label>
                            <button onClick={handleAdd} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-violet-700 hover:-translate-y-0.5 transition-all">Add Event</button>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex gap-2 items-center">
                        <Check className="w-4 h-4"/> Save Calendar
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

const Home = () => {
    const { isHOD } = useUser();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Dynamic Calendar State
    const [calendarData, setCalendarData] = useState({});
    const [showManageCalendar, setShowManageCalendar] = useState(false);

    useEffect(() => {
        setCalendarData(getAcademicCalendar());
        const handleUpdate = () => setCalendarData(getAcademicCalendar());
        window.addEventListener('calendarDataUpdated', handleUpdate);
        return () => window.removeEventListener('calendarDataUpdated', handleUpdate);
    }, []);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    const monthlyEvents = calendarData[year]?.[currentMonthName]?.events || [];

    const features = [
        {
            title: isHOD ? "Generator Suite" : "Timetable Viewer",
            desc: isHOD ? "Advanced algorithm to compile conflict-free schedules." : "Review scheduled slots dynamically.",
            icon: Table2,
            path: isHOD ? '/generator' : '/timetable',
            gradient: "from-blue-500 to-cyan-400",
            bgLight: "bg-blue-50"
        },
        {
            title: "Course Catalog",
            desc: "Extensive department syllabus allocation.",
            icon: BookOpen,
            path: '/subjects',
            gradient: "from-fuchsia-500 to-pink-500",
            bgLight: "bg-fuchsia-50"
        },
        {
            title: "Faculty Roster",
            desc: "Expert profiles and role distribution.",
            icon: Users,
            path: '/staff',
            gradient: "from-violet-500 to-purple-500",
            bgLight: "bg-violet-50"
        },
        {
            title: "Data Export",
            desc: "Acquire hardcopy reports of system states.",
            icon: Download,
            path: '/downloads',
            gradient: "from-emerald-400 to-teal-500",
            bgLight: "bg-emerald-50"
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="w-full relative">
            
            {/* Hero Section */}
            <div className="text-center max-w-4xl mx-auto py-16 px-4">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-widest mb-8 shadow-sm border border-violet-200"
                >
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span>Next Generation Planning</span>
                </motion.div>

                <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                    className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6"
                >
                    Academic Planning <br/>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500">
                        Synchronized.
                    </span>
                </motion.h1>

                <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                    className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium"
                >
                    A unified, state-of-the-art interface managing the Kamaraj College departmental scheduling grids, faculty profiles, and syllabus deployments.
                </motion.p>
            </div>

            {/* Bento Grid Tools & Calendar */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12"
            >
                {/* Apps Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            whileHover={{ y: -8, scale: 1.02 }}
                            onClick={() => navigate(feature.path)}
                            className="group relative bg-white/60 backdrop-blur-md border border-white/80 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
                        >
                            {/* Decorative Glow inside card */}
                            <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${feature.gradient} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-500`}></div>

                            <div className="relative z-10">
                                <div className={`w-14 h-14 rounded-2xl ${feature.bgLight} flex items-center justify-center mb-6 shadow-sm border border-white`}>
                                    <feature.icon className={`w-7 h-7 bg-clip-text text-transparent bg-gradient-to-br ${feature.gradient} fill-transparent text-slate-800`} />
                                </div>
                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">{feature.title}</h3>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-[90%]">
                                    {feature.desc}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 mt-6 text-sm font-bold text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-wider relative z-10">
                                Enter App 
                                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-2 transition-transform duration-300" />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Aesthetic Calendar Panel */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(192,38,211,0.2)] relative overflow-hidden h-full border border-fuchsia-400/30 flex flex-col">
                        {/* Dramatic Light leak */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[80px] pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10"><CalendarIcon className="w-5 h-5 text-fuchsia-100" /></div>
                                <h2 className="text-lg font-bold tracking-tight">Calendar</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {isHOD && (
                                    <button 
                                        onClick={() => setShowManageCalendar(true)} 
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 transition-all text-fuchsia-100 group"
                                        title="Manage Calendar"
                                    >
                                        <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                    </button>
                                )}
                                <div className="flex gap-0.5 bg-white/5 p-1 rounded-xl backdrop-blur-sm border border-white/10">
                                    <button onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                    <button onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>

                        <div className="text-2xl font-extrabold mb-6 relative z-10 text-white drop-shadow-md">
                            {currentMonthName} <span className="text-fuchsia-200/80 font-light">{year}</span>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-fuchsia-200/80 uppercase tracking-widest mb-4 relative z-10">
                            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                        </div>

                        <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center text-sm font-semibold relative z-10">
                            {[...Array(firstDayOfMonth)].map((_, i) => <div key={`e-${i}`} />)}
                            {[...Array(daysInMonth)].map((_, i) => {
                                const d = i + 1;
                                const isToday = d === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && year === new Date().getFullYear();
                                const hasEvent = monthlyEvents.some(evt => parseInt(evt.date.split('.')[0] || 0) === d);
                                const isHolidayEvent = hasEvent && monthlyEvents.find(evt => parseInt(evt.date.split('.')[0] || 0) === d)?.isHoliday;

                                return (
                                    <div key={d} className="flex justify-center items-center h-8 relative group">
                                        <span className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all font-bold
                                            ${isToday ? 'bg-white text-violet-600 shadow-xl shadow-fuchsia-500/20 scale-110 z-20' : 
                                              'text-fuchsia-50/90 hover:bg-white/10 cursor-pointer hover:border hover:border-white/20'}`}
                                        >
                                            {d}
                                        </span>
                                        {hasEvent && !isToday && (
                                            <div className={`absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isHolidayEvent ? 'bg-red-400' : 'bg-fuchsia-300'} shadow-sm`}></div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        
                        {/* Event List */}
                        <div className="mt-8 pt-6 border-t border-white/10 relative z-10 flex-1 flex flex-col">
                            <h3 className="text-xs font-bold text-fuchsia-200/70 uppercase tracking-widest mb-4">Agenda</h3>
                            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[160px]">
                                {monthlyEvents.length === 0 ? (
                                    <div className="text-sm text-fuchsia-200/50 italic opacity-80">No events scheduled.</div>
                                ) : (
                                    monthlyEvents.map((evt, i) => (
                                        <div key={i} className="flex gap-3 items-start group cursor-pointer">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-sm ${evt.isHoliday ? 'bg-red-400 shadow-red-400/50' : 'bg-fuchsia-300 shadow-fuchsia-300/50'} group-hover:scale-125 transition-transform`}></div>
                                            <span className="text-sm text-fuchsia-50/90 group-hover:text-white transition-colors leading-snug">{evt.date} - {evt.event}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Modal Injection */}
            <AnimatePresence>
                {showManageCalendar && (
                    <CalendarManagerModal
                        onClose={() => setShowManageCalendar(false)}
                        calendarData={calendarData}
                        selectedYear={year}
                        selectedMonth={currentMonthName}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Home;
