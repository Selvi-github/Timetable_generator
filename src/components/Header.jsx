import React from 'react';
import { Bell, MessageSquare, Medal, BookOpen } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Header = () => {
    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm font-sans">


            {/* Main Banner Content */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                    {/* Left: Logo */}
                    <div className="flex-shrink-0">
                        <img src="/logo.png" alt="Kamaraj College Logo" className="h-24 w-auto object-contain" />
                    </div>

                    {/* Center: Institution Details */}
                    <div className="text-center flex-1">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-brand-dark tracking-wider font-serif mb-3 leading-tight whitespace-nowrap">
                            KAMARAJ COLLEGE OF ENGINEERING & TECHNOLOGY
                        </h1>

                        <div className="flex flex-col items-center gap-2">
                            {/* Affiliation Pill */}
                            <div className="bg-slate-50 px-6 py-1.5 rounded-full border border-slate-100 shadow-sm max-w-full overflow-hidden">
                                <p className="text-[10px] md:text-[11px] font-semibold text-slate-600 text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                                    (An Autonomous Institution - Affiliated to Anna University, Chennai) &bull; Approved by AICTE, New Delhi
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Badges */}


                </div>
            </div>
        </header>
    );
};

export default Header;
