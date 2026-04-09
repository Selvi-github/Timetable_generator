import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, Download, Book, ChevronDown } from 'lucide-react';
import { getUnifiedSubjectData, getAcademicCalendar } from '../utils/dataStore';
import { exportSyllabusPDF } from '../utils/pdfGenerator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const Downloads = () => {
    const [selectedSemester, setSelectedSemester] = useState('');

    const semesters = [
        "Semester 1", "Semester 2", "Semester 3", "Semester 4",
        "Semester 5", "Semester 6", "Semester 7", "Semester 8"
    ];
    const handleDownloadSyllabus = () => {
        if (!selectedSemester) return;
        
        try {
            const allData = getUnifiedSubjectData();
            let targetSubjects = [];
            
            // Search all years for the matching semester
            Object.keys(allData).forEach(year => {
                const semData = allData[year][selectedSemester];
                if (semData) {
                    targetSubjects = [
                        ...(semData.subjects || []),
                        ...(semData.honors || [])
                    ];
                }
            });

            if (targetSubjects.length === 0) {
                alert(`No subjects found mapped to ${selectedSemester}.`);
                return;
            }

            exportSyllabusPDF(selectedSemester, targetSubjects);
        } catch (error) {
            console.error("Failed to generate PDF", error);
            alert("An error occurred while generating the syllabus PDF.");
        }
    };

    const handleDownloadCalendar = () => {
        try {
            const calendarData = getAcademicCalendar();
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.width;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(22, 60, 122);
            doc.text("KAMARAJ COLLEGE OF ENGINEERING & TECHNOLOGY", pageWidth / 2, 16, { align: "center" });
            
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text("ACADEMIC CALENDAR REPORT", pageWidth / 2, 26, { align: "center" });

            let currentY = 35;

            // Flat map all events
            const allEvents = [];
            Object.keys(calendarData).forEach(year => {
                Object.keys(calendarData[year]).forEach(month => {
                    (calendarData[year][month].events || []).forEach(evt => {
                        allEvents.push({
                            year, month, ...evt
                        });
                    });
                });
            });

            if (allEvents.length === 0) {
                alert("The academic calendar is currently empty.");
                return;
            }

            const tableBody = allEvents.map(evt => [
                evt.date,
                `${evt.month} ${evt.year}`,
                evt.event,
                evt.isHoliday ? 'Holiday' : 'Working Day'
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [["Date", "Month", "Event Name", "Status"]],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [147, 51, 234], fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 25 },
                    3: { cellWidth: 30, fontStyle: 'bold' }
                },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 3 && data.cell.text[0] === 'Holiday') {
                        data.cell.styles.textColor = [220, 38, 38]; // Red text for holidays
                    }
                }
            });

            // Robust Save
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Academic_Calendar.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);

        } catch (error) {
            console.error("Calendar export failed", error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8 animate-in fade-in duration-500 font-sans">
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Downloads & Resources</h1>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                    Access important academic documents. Download syllabi by semester or the full academic calendar.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

                {/* 1. Syllabus Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm">
                            <Book className="w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Course Syllabus</h3>
                        <p className="text-slate-500 mb-8">Select your semester to download the specific curriculum and course details.</p>

                        <div className="space-y-4">
                            <div className="relative">
                                <select
                                    value={selectedSemester}
                                    onChange={(e) => setSelectedSemester(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer transition-shadow hover:bg-slate-100"
                                >
                                    <option value="" disabled>Select Semester</option>
                                    {semesters.map(sem => (
                                        <option key={sem} value={sem}>{sem}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            </div>

                            <button
                                onClick={handleDownloadSyllabus}
                                disabled={!selectedSemester}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg
                                    ${selectedSemester
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1 active:scale-95 shadow-blue-500/30'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                                    }
                                `}
                            >
                                <Download className="w-5 h-5" />
                                {selectedSemester ? `Download ${selectedSemester} Syllabus` : 'Select Semester to Download'}
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Academic Calendar Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-50 rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6 shadow-sm">
                            <Calendar className="w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Academic Calendar</h3>
                        <p className="text-slate-500 mb-8">Download the official academic calendar for the year 2025-2026, including holidays and exam dates.</p>

                        <div className="mt-auto">
                            <div className="bg-purple-50 p-4 rounded-xl mb-6 border border-purple-100">
                                <div className="flex items-center justify-between text-sm text-purple-700 font-bold mb-1">
                                    <span>Format</span>
                                    <span>Size</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-purple-600/70">
                                    <span>High-Res PDF</span>
                                    <span>1.2 MB</span>
                                </div>
                            </div>

                            <button
                                onClick={handleDownloadCalendar}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-white shadow-lg bg-purple-600 hover:bg-purple-700 hover:-translate-y-1 active:scale-95 transition-all duration-300"
                            >
                                <Download className="w-5 h-5" />
                                Download Full Calendar
                            </button>
                        </div>
                    </div>
                </motion.div>

            </div>
        </div>
    );
};

export default Downloads;
