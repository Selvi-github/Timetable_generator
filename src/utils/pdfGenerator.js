import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportTimetablePDF = (timetableConfig, timetableData, staffMapping) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape, millimeters, A4
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- 1. HEADER SECTION ---
    // College Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(22, 60, 122); // Dark Blue (Matches brand)
    // Shift text slightly to center but respect logo, or kept centered
    doc.text("KAMARAJ COLLEGE OF ENGINEERING & TECHNOLOGY", pageWidth / 2, 15, { align: "center" });

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("(An Autonomous Institution - Affiliated to Anna University, Chennai)", pageWidth / 2, 22, { align: "center" });

    // Department
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", pageWidth / 2, 32, { align: "center" });

    // Academic Year & Title
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Academic Year: 2025 - 2026 | Semester: ${timetableConfig.semester.toUpperCase()}`, pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(pageWidth / 2 - 40, 44, 80, 8, 'F'); // Background pill
    doc.text(`CLASS TIMETABLE - ${timetableConfig.year} - SECTION ${timetableConfig.section}`, pageWidth / 2, 50, { align: "center" });

    // --- 2. TIMETABLE GRID ---
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [
        "09:10-10:00", "10:00-10:50", "10:50-11:10", "11:10-12:00", "12:00-12:50", "12:50-01:30", "01:30-02:15", "02:15-03:00", "03:00-03:40", "03:40-04:20"
    ];
    // Headers: Day + Time Slots
    const tableHead = [["Day / Time", "1", "2", "Break", "3", "4", "Lunch", "5", "6", "7", "8"]];
    const tableBody = [];

    days.forEach(day => {
        const row = [day.substring(0, 3).toUpperCase()]; // MON, TUE...
        // Fetch slots
        // We need to map slot IDs (1,2,interval,3,4,lunch,5,6,7,8) to this flat array
        const slotIds = [1, 2, 'interval', 3, 4, 'lunch', 5, 6, 7, 8];

        slotIds.forEach(id => {
            if (id === 'interval') {
                // Push BREAK only once per row if we want to merge, but autotable merge is complex. 
                // Simple approach: Just add text "BREAK"
                row.push("BREAK");
            } else if (id === 'lunch') {
                row.push("LUNCH");
            } else {
                const session = timetableData[day]?.find(s => s.slot === id);
                if (session) {
                    // Format: "SUB (STAFF)"
                    row.push(`${session.code}\n(${session.staff})`);
                } else {
                    row.push("-");
                }
            }
        });
        tableBody.push(row);
    });

    autoTable(doc, {
        startY: 58,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [22, 60, 122],
            textColor: 255,
            halign: 'center',
            valign: 'middle',
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: {
            halign: 'center',
            valign: 'middle',
            fontSize: 8,
            cellPadding: 2
        },
        styles: {
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 20 }, // Day Col
            3: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellWidth: 10 }, // Break
            6: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellWidth: 15 } // Lunch
        },
        didParseCell: function (data) {
            // Rotate text for Break/Lunch if vertical space? No, horizontal is fine for A4 Landscape
        }
    });

    // --- 3. STAFF ALLOCATION FOOTER ---
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Staff Allocation:", 14, finalY);

    if (staffMapping && staffMapping.length > 0) {
        // Create a mini table for staff
        const staffBody = staffMapping.map(m => [m.code, m.name, m.staff === 'TBD' ? 'Unassigned' : m.staff]);

        // Calculate split if too long? For now assume it fits or autoTable handles pages (not ideal for 1 page view)
        // Let's print simple text columns if table is overkill, but table is cleaner
        autoTable(doc, {
            startY: finalY + 2,
            head: [["Subject Code", "Subject Name", "Faculty Name"]],
            body: staffBody,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fontStyle: 'bold', fontSize: 8, fillColor: [240, 240, 240] },
            margin: { left: 14, right: 100 }, // Keep it on the left side
            tableWidth: 180
        });
    }

    // --- 4. SIGNATURES ---
    const pageBottom = pageHeight - 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");

    doc.text("Class In-Charge", 40, pageBottom, { align: "center" });
    doc.text("HOD / CSE", pageWidth / 2, pageBottom, { align: "center" });
    doc.text("Principal", pageWidth - 40, pageBottom, { align: "center" });

    // Robust Save
    const filename = `Timetable_${timetableConfig.year}_${timetableConfig.section}.pdf`;
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const exportSyllabusPDF = (semester, subjectsArray) => {
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait for Syllabus
    const pageWidth = doc.internal.pageSize.width;

    // --- 1. HEADER SECTION ---

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(22, 60, 122); 
    doc.text("KAMARAJ COLLEGE OF ENGINEERING & TECHNOLOGY", pageWidth / 2, 16, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("(An Autonomous Institution - Affiliated to Anna University, Chennai)", pageWidth / 2, 22, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", pageWidth / 2, 30, { align: "center" });

    doc.setFillColor(245, 240, 255); // Violet tint
    doc.rect(14, 35, pageWidth - 28, 8, 'F'); 
    doc.setFontSize(11);
    doc.text(`COURSE SYLLABUS LIST - ${semester.toUpperCase()}`, pageWidth / 2, 40, { align: "center" });

    let currentY = 50;

    // --- 2. TABLE ---
    const tableHead = [["Course Code", "Course Name", "Type", "Periods/Week"]];
    const tableBody = subjectsArray.map(sub => [
        sub.code,
        sub.name,
        sub.type.toUpperCase(),
        sub.academicRule?.periodsPerWeek || '-'
    ]);

    autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [124, 58, 237], // Violet-600
            textColor: 255,
            halign: 'center',
            fontStyle: 'bold'
        },
        bodyStyles: {
            halign: 'center',
            cellPadding: 3
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { halign: 'left' } 
        }
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // Robust Save
    const filename = `Course_Syllabus_${semester.replace(/\s+/g, '_')}.pdf`;
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};
