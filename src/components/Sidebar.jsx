import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarClock, ArrowLeftRight, Siren, FileText, BarChart2, Download, Settings, LogOut, User, BookOpen, Home } from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { name: 'Home', path: '/dashboard', icon: Home },
        { name: 'Generate Timetable', path: '/generate', icon: CalendarClock },
        { name: 'Timetable View', path: '/timetable', icon: FileText },
        { name: 'Staff Profiles', path: '/staff', icon: User },
        { name: 'Subjects', path: '/subjects', icon: BookOpen },
        { name: 'Swap Requests', path: '/swap-requests', icon: ArrowLeftRight },
    ];

    return (
        <div className="w-64 bg-brand-dark flex flex-col text-white shadow-xl flex-shrink-0 h-full">
            {/* Top Spacing / Menu Label */}
            <div className="h-4"></div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-brand-accent text-brand-dark shadow-md'
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                    </NavLink>
                ))}
            </div>

            {/* Footer / Settings */}
            <div className="p-4 border-t border-white/10">
                <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all">
                    <Settings className="w-5 h-5" />
                    Previous Settings
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
