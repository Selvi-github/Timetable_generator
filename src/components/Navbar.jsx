import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, CalendarClock, FileText, User, BookOpen, Download, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

import { useUser } from '../context/UserContext';

const Navbar = () => {
    const { isHOD, isAuthenticated, logout } = useUser();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = [
        { name: 'Home', path: '/home', icon: Home },
        ...(isHOD ? [{ name: 'Generate Timetable', path: '/generator', icon: CalendarClock }] : []),
        { name: 'Timetable View', path: '/timetable', icon: FileText },
        { name: 'Staff Profiles', path: '/staff', icon: User },
        { name: 'Subjects', path: '/subjects', icon: BookOpen },
        { name: 'Downloads', path: '/downloads', icon: Download },
    ];

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-30 bg-brand-dark border-b border-white/10 shadow-lg"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="flex justify-center h-16 items-center">

                    {/* Desktop Menu */}
                    <div className="flex space-x-4 overflow-x-auto no-scrollbar">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) =>
                                    `group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 whitespace-nowrap ${isActive
                                        ? 'bg-brand-accent text-brand-dark shadow-md'
                                        : 'text-white/90 hover:text-brand-accent hover:bg-white/10'
                                    }`
                                }
                            >
                                <item.icon className="w-4 h-4" />
                                {item.name}
                            </NavLink>
                        ))}
                    </div>

                </div>

                {/* Logout Button (Absolute Right) */}
                {isAuthenticated && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 rounded-lg transition-all duration-300 text-sm font-medium border border-transparent hover:border-red-500/30"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </motion.nav>
    );
};

export default Navbar;
