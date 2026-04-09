import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, BookOpen, Calendar, LogOut, Menu, X, Clock, Download } from 'lucide-react';

import { useUser } from '../../context/UserContext';
import Footer from '../Footer';

const DashboardLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { isHOD, logout } = useUser();

    const navItems = [
        { icon: LayoutDashboard, label: 'Home', path: '/home' },
        ...(isHOD ? [{ icon: Calendar, label: 'Generator', path: '/generator' }] : []),
        { icon: Clock, label: 'Timetable', path: '/timetable' },
        { icon: Users, label: 'Staff', path: '/staff' },
        { icon: BookOpen, label: 'Subjects', path: '/subjects' },
        { icon: Download, label: 'Downloads', path: '/downloads' },
    ];

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans relative overflow-hidden">

            {/* Ambient Multi-color Orbs Background */}
            <div className="fixed top-0 left-0 w-full h-[800px] overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-400/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute top-[20%] left-[40%] w-[400px] h-[400px] bg-yellow-400/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-4000"></div>
            </div>

            {/* Premium Floating Navigation Pill */}
            <motion.nav 
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-auto"
            >
                <div className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-full px-2 py-2 flex items-center justify-between md:justify-center gap-2">
                    
                    {/* College Mini Logo */}
                    <div className="shrink-0 pl-3 hidden md:flex items-center">
                        <img src="/logo.png" alt="Logo" className="h-8 w-auto mr-4 drop-shadow-sm" />
                        <div className="h-6 w-px bg-slate-300 mr-2"></div>
                    </div>

                    {/* Desktop Links (Framer Motion Shared Layout) */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <NavLink
                                    key={item.label}
                                    to={item.path}
                                    className={`relative px-4 py-2.5 rounded-full text-[13px] font-bold tracking-wide transition-colors z-10 ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute inset-0 bg-white rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.06)] -z-10 border border-slate-100"
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        />
                                    )}
                                    <div className="flex items-center gap-2 relative z-10">
                                        <item.icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                                        <span>{item.label}</span>
                                    </div>
                                </NavLink>
                            );
                        })}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center pl-3">
                        <img src="/logo.png" alt="Logo" className="h-8 w-auto mr-2" />
                        <span className="font-bold text-slate-800 text-sm">Portal</span>
                    </div>
                    <button
                        className="md:hidden p-2 text-slate-600 rounded-full hover:bg-white/50"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>

                    {/* Logout */}
                    <div className="hidden md:flex pl-2 border-l border-slate-200/50">
                        <button
                            onClick={() => { logout(); navigate('/'); }}
                            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors group"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="absolute top-full left-0 w-full mt-3 bg-white/90 backdrop-blur-3xl border border-white/50 shadow-2xl rounded-3xl overflow-hidden p-3 flex flex-col gap-1 md:hidden"
                    >
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <NavLink
                                    key={item.label}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`
                                        flex items-center px-4 py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all
                                        ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50'}
                                    `}
                                >
                                    <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                        <button
                            onClick={() => { logout(); navigate('/'); }}
                            className="flex items-center px-4 py-3.5 mt-2 rounded-2xl text-sm font-bold tracking-wide transition-all text-red-500 bg-red-50 hover:bg-red-100"
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            Sign Out
                        </button>
                    </motion.div>
                )}
            </motion.nav>

            {/* Main Content Area */}
            <main className="flex-1 w-full relative z-10 pt-32 pb-12">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                >
                    <Outlet />
                </motion.div>
            </main>

            {/* Footer */}
            <div className="z-10 relative">
                <Footer />
            </div>
        </div>
    );
};

export default DashboardLayout;
