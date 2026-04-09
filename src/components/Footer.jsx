import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Linkedin, ChevronUp } from 'lucide-react';

const Footer = () => {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const links = [
        { title: "Home", href: "/home" },
        { title: "Timetable View", href: "/timetable" },
        { title: "Staff Profile", href: "/staff" },
        { title: "Subjects", href: "/subjects" },
        { title: "Download", href: "/downloads" }
    ];

    return (
        <footer className="w-full font-sans relative z-10">
            {/* Main Footer Content - Premium Light Glass Theme */}
            <div className="bg-white/80 backdrop-blur-3xl border-t border-slate-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] py-12 px-6 lg:px-12 relative overflow-hidden">
                
                {/* Subtle Background Glows */}
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-fuchsia-100/40 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-100/40 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10">

                    {/* Left Section: Logo & Address */}
                    <div className="flex items-center gap-6">
                        {/* Logo Pill */}
                        <div className="bg-white rounded-2xl p-2 shrink-0 shadow-sm border border-slate-100 w-16 h-16 flex items-center justify-center">
                            <img src="/logo.png" alt="College Logo" className="w-full h-full object-contain drop-shadow-sm" />
                        </div>

                        {/* Text Details */}
                        <div className="text-left">
                            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                                Kamaraj College of Engineering & Technology
                            </h2>
                            <p className="text-sm text-slate-500 font-semibold mt-1 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Virudhunagar, Tamil Nadu
                            </p>

                            {/* Social Icons - Sleek Minimalist */}
                            <div className="flex gap-3 mt-4">
                                <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"><Facebook size={16} /></a>
                                <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50 transition-all"><Instagram size={16} /></a>
                                <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"><Youtube size={16} /></a>
                                <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-all"><Linkedin size={16} /></a>
                            </div>
                        </div>
                    </div>

                    {/* Right Section: Navigation Links */}
                    <nav className="flex flex-col md:items-end gap-3 text-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Quick Links</div>
                        <div className="flex flex-wrap gap-x-8 gap-y-3 justify-start md:justify-end">
                            {links.map((link, index) => (
                                <Link
                                    key={index}
                                    to={link.href}
                                    className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold flex items-center gap-1 group"
                                >
                                    <span className="w-0 overflow-hidden group-hover:w-2 transition-all block h-0.5 bg-slate-900 rounded-full"></span>
                                    {link.title}
                                </Link>
                            ))}
                        </div>
                    </nav>
                </div>
            </div>

            {/* Bottom Bar - Clean Muted Tone */}
            <div className="bg-white border-t border-slate-100 py-6 px-6 lg:px-12 relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs font-semibold text-slate-400 gap-4">
                    <p className="text-center md:text-left">
                        Copyright © {new Date().getFullYear()}, Developed by Kamaraj Engineering College Website Team. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
                    </div>
                </div>

                {/* Floating Scroll to Top Pill */}
                <button
                    onClick={scrollToTop}
                    className="absolute right-6 top-1/2 -translate-y-1/2 bg-white border border-slate-200 shadow-lg text-slate-600 p-2.5 rounded-full hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-2 transition-all hidden md:flex items-center justify-center group"
                    aria-label="Scroll to top"
                >
                    <ChevronUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                </button>
            </div>
        </footer>
    );
};

export default Footer;
