import { getUnifiedSubjectData } from './dataStore.js';

// Global Constants
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];

// Helper: Get Section-Specific Staff
// Distributes staff across sections A, B, C based on total count
export const getSectionStaff = (staffConfig, section) => {
    // 1. Check for Explicit Section Mapping (Preferred)
    if (section === 'A' && staffConfig.sectionA) return staffConfig.sectionA;
    if (section === 'B' && staffConfig.sectionB) return staffConfig.sectionB;
    if (section === 'C' && staffConfig.sectionC) return staffConfig.sectionC;

    // 2. Proportional Distribution (Fallback for legacy data)
    const allStaff = staffConfig.primary || [];
    const staffCount = allStaff.length;

    if (staffCount === 0) return [];

    const staffPerSection = Math.floor(staffCount / 3);
    const remainder = staffCount % 3;

    let index = 0;

    // Section A gets extra if remainder > 0
    const countA = staffPerSection + (remainder > 0 ? 1 : 0);
    if (section === 'A') {
        return allStaff.slice(index, index + countA);
    }
    index += countA;

    // Section B gets extra if remainder > 1
    const countB = staffPerSection + (remainder > 1 ? 1 : 0);
    if (section === 'B') {
        return allStaff.slice(index, index + countB);
    }
    index += countB;

    // Section C gets the rest
    if (section === 'C') {
        return allStaff.slice(index);
    }

    // Fallback: return all staff if section not recognized
    return allStaff;
};

// Helper: Generate Staff Mapping for Display
const generateStaffMapping = (timetable, section) => {
    const mapping = {};

    // Collect unique subject-staff pairs
    Object.values(timetable).flat().forEach(slot => {
        // Show all subjects including special ones, but only if they have staff and code
        if (slot.code && slot.staff) {
            if (!mapping[slot.code]) {
                mapping[slot.code] = {
                    code: slot.code,
                    name: slot.name,
                    staff: slot.staff,
                    section: section
                };
            }
        }
    });

    return Object.values(mapping).sort((a, b) => a.code.localeCompare(b.code));
};

// Fixed Global Slots
const GLOBAL_SLOTS = [
    { day: 'Monday', slot: 1, code: 'GEAR', name: 'GEAR UP' },
    { day: 'Tuesday', slot: 1, code: 'GEAR', name: 'GEAR UP' },
    { day: 'Wednesday', slot: 1, code: 'GEAR', name: 'GEAR UP' },
    { day: 'Thursday', slot: 1, code: 'GEAR', name: 'GEAR UP' },
    { day: 'Friday', slot: 1, code: 'GEAR', name: 'GEAR UP' },
    { day: 'Saturday', slot: 1, code: 'GEAR', name: 'GEAR UP' },
    { day: 'Wednesday', slot: 7, code: 'COUN', name: 'Counselling' }
];

export const generateTimetable = (config, allSubjectsOverride = null) => {
    const { year, semester, section, subjects: selectedSubjects } = config;

    // Load global state for cross-section collision detection
    const getStorage = (key) => {
        try {
            if (typeof localStorage !== 'undefined') {
                return JSON.parse(localStorage.getItem(key) || '{}');
            }
        } catch (e) { console.error(e); }
        return {};
    };

    let globalStaffUsage = getStorage('timetable_global_staff_usage');
    let globalSubjectUsage = getStorage('timetable_global_subject_usage');
    let globalHonorsSlots = getStorage('timetable_global_honors');

    const currentContextKey = `${year}_${section}`;

    // CLEANUP: Remove old entries for this specific section
    Object.keys(globalStaffUsage).forEach(key => {
        if (globalStaffUsage[key] === currentContextKey) {
            delete globalStaffUsage[key];
        }
    });

    Object.keys(globalSubjectUsage).forEach(key => {
        if (globalSubjectUsage[key] === currentContextKey) {
            delete globalSubjectUsage[key];
        }
    });

    // 1. Initialize Empty Grid & Local Trackers
    const timetable = {};
    const allSubjectData = allSubjectsOverride || getUnifiedSubjectData();
    const semesterInfo = allSubjectData[year]?.[semester];

    DAYS.forEach(day => {
        timetable[day] = [];

        // Pre-populate Global Slots
        GLOBAL_SLOTS.filter(g => g.day === day).forEach(g => {
            // Find staff in subject data for override
            let assignedStaff = g.code === 'COUN' ? 'Counselling Team' : 'Coordinator';

            if (semesterInfo) {
                const subDetail = (semesterInfo.subjects || []).find(s => s.code === g.code) ||
                    (semesterInfo.honors || []).find(s => s.code === g.code);
                if (subDetail && subDetail.staffConfig) {
                    const sectionStaff = getSectionStaff(subDetail.staffConfig, section);
                    if (sectionStaff && sectionStaff.length > 0) {
                        assignedStaff = sectionStaff[0];
                    }
                }
            }

            timetable[day].push({
                slot: g.slot,
                code: g.code,
                name: g.name,
                staff: assignedStaff,
                isFixed: true,
                type: 'theory'
            });

            // Track usage for global conflicts
            if (assignedStaff && assignedStaff !== 'TBD' && assignedStaff !== 'Counselling Team' && assignedStaff !== 'Coordinator') {
                const staffKey = `${day}_${g.slot}_${assignedStaff}`;
                globalStaffUsage[staffKey] = currentContextKey;
            }
        });
    });

    // Local Staff Tracker
    const staffDailyTracker = {};

    const trackStaffUsage = (staff, day, slot) => {
        if (!staff || staff === 'TBD') return;
        const key = `${staff}-${day}`;
        if (!staffDailyTracker[key]) staffDailyTracker[key] = [];
        staffDailyTracker[key].push(slot);
        staffDailyTracker[key].sort((a, b) => a - b);
    };

    const getStaffDailyCount = (staff, day) => {
        if (!staff || staff === 'TBD') return 0;
        return (staffDailyTracker[`${staff}-${day}`] || []).length;
    };

    // Helper: Check if slot is free in CURRENT timetable & respects Global Honors Lock
    const isSlotFree = (day, slot, subCode = null) => {
        // 1. Local Grid Check
        if (timetable[day].some(s => s.slot === slot)) return false;

        // 2. Global Honors Sync Check
        // If this slot is taken by ANY honors subject in this semester, 
        // it is ONLY free if the current subject IS that honors subject.
        const semPrefix = `${year}_${semester}`;
        const foundKey = Object.keys(globalHonorsSlots).find(key => {
            if (key.startsWith(semPrefix)) {
                const slots = globalHonorsSlots[key];
                return Array.isArray(slots) && slots.some(s => s.day === day && s.slot === slot);
            }
            return false;
        });

        if (foundKey) {
            const honorsCode = foundKey.split('_').slice(2).join('_'); // Get everything after Year_Sem
            if (subCode !== honorsCode) return false; // Reserved for another honors subject
        }

        return true;
    };

    // 4. PRE-CALCULATE GLOBAL STAFF SLOTS (Parse storage once for efficiency)
    // Structure: { "StaffName-Day": [slot, slot...] }
    const globalStaffTracker = {};

    Object.keys(globalStaffUsage).forEach(key => {
        // key format: "Day_Slot_StaffName" (Note: Day might be Monday, Tuesday...)
        // But wait, the key format in bookResource is `${day}_${slot}_${staffName}`
        const parts = key.split('_');
        if (parts.length >= 3) {
            const day = parts[0];
            const slot = parseInt(parts[1], 10);
            const staff = parts.slice(2).join('_'); // Join back in case name has underscores (?) 
            // Actually name is usually simple. Let's handle standard case.

            // Re-verify key generation: `${day}_${slot}_${staffName}`

            if (globalStaffUsage[key] !== currentContextKey) {
                const mapKey = `${staff}-${day}`;
                if (!globalStaffTracker[mapKey]) globalStaffTracker[mapKey] = [];
                globalStaffTracker[mapKey].push(slot);
            }
        }
    });

    const getGlobalStaffSlots = (staff, day) => {
        if (!staff || staff === 'TBD') return [];
        const globalSlots = globalStaffTracker[`${staff}-${day}`] || [];
        const localSlots = staffDailyTracker[`${staff}-${day}`] || [];
        // Context is already filtered for globalSlots (excludes current), localSlots checks current.
        // Return combined unique sorted slots
        return [...new Set([...globalSlots, ...localSlots])].sort((a, b) => a - b);
    };

    const isStaffFree = (staffName, day, slot, grid, isLab = false) => {
        if (!staffName || staffName === 'TBD') return true;

        // 1. Global Clash Check (Occupied in another section at same time)
        const key = `${day}_${slot}_${staffName}`;
        const occupiedBy = globalStaffUsage[key];
        if (occupiedBy && occupiedBy !== currentContextKey) return false;

        // Get Compounded Usage (Global + Local)
        const allSlots = getGlobalStaffSlots(staffName, day);

        // 2. Global + Local Daily Limit Check (Max 5 per day)
        // If we are about to add this slot, count will be length + 1
        if (allSlots.length >= 5) return false;

        // 3. Global + Local Continuous Check (Max 2 consecutive for non-lab)
        if (!isLab) {
            const hypotheticalSlots = [...allSlots, slot].sort((a, b) => a - b);
            let consecutive = 1;
            for (let i = 1; i < hypotheticalSlots.length; i++) {
                if (hypotheticalSlots[i] === hypotheticalSlots[i - 1] + 1) {
                    consecutive++;
                    if (consecutive > 2) return false;
                } else {
                    consecutive = 1;
                }
            }
        }

        return true;
    };

    const isResourceFree = (subjectCode, day, slot) => {
        // Prevent same subject in different sections at the same time (shared labs/slots)
        const key = `${day}_${slot}_${subjectCode}`;
        const occupiedBy = globalSubjectUsage[key];
        return !occupiedBy || occupiedBy === currentContextKey;
    };

    const bookResource = (staffName, subjectCode, day, slot) => {
        const staffKey = `${day}_${slot}_${staffName}`;
        const subjectKey = `${day}_${slot}_${subjectCode}`;
        if (staffName && staffName !== 'TBD') {
            globalStaffUsage[staffKey] = currentContextKey;
            trackStaffUsage(staffName, day, slot);
        }
        if (subjectCode) globalSubjectUsage[subjectKey] = currentContextKey;
    };

    if (!semesterInfo) return timetable;

    // Hydrate & Expand "Theory+Lab" types
    let allocateList = [];

    selectedSubjects.forEach(sel => {
        const allSubjects = [
            ...(semesterInfo.subjects || []),
            ...(semesterInfo.honors || [])
        ];
        const data = allSubjects.find(s => s.code === sel.code);
        if (!data) return;

        // Custom Handling for Hybrid subjects (marked with #)
        // Rule: 45 periods/sem -> 3 periods/week. 2 periods are Lab (continuous), 1 period is Theory.
        const isHybrid = data.name.includes('#') || data.type === 'theory+lab';
        const isSQL = data.name.toUpperCase().includes('SQL');

        if (isHybrid) {
            // Split into TWO allocation requests
            // Rule: 4 periods total -> 2 periods continuous Lab + 2 periods Theory
            // 1. Lab Component (2 periods continuous)
            allocateList.push({
                ...data,
                virtualId: data.code + '_LAB',
                type: 'lab',
                academicRule: { ...data.academicRule, periodsPerWeek: 2, continuous: true },
                fixedDay: sel.fixedDay,
                fixedSlot: sel.fixedSlot,
                isSplit: true,
                allocatedCount: 0
            });
            // 2. Theory Component (2 periods)
            allocateList.push({
                ...data,
                virtualId: data.code + '_THEORY',
                type: 'theory',
                academicRule: { ...data.academicRule, periodsPerWeek: data.academicRule.periodsPerWeek - 2, continuous: false },
                fixedDay: null,
                fixedSlot: null,
                isSplit: true,
                allocatedCount: 0
            });
        } else if (isSQL) {
            // SQL rule: 2 periods continuously per week
            allocateList.push({
                ...data,
                fixedDay: sel.fixedDay,
                fixedSlot: sel.fixedSlot,
                type: 'lab', // Treat as lab to force continuous logic
                academicRule: { ...data.academicRule, continuous: true, periodsPerWeek: Math.min(data.academicRule.periodsPerWeek, 2) },
                allocatedCount: 0
            });
            if (data.academicRule.periodsPerWeek > 2) {
                allocateList.push({
                    ...data,
                    virtualId: data.code + '_EXTRA',
                    type: 'theory',
                    academicRule: { ...data.academicRule, continuous: false, periodsPerWeek: data.academicRule.periodsPerWeek - 2 },
                    allocatedCount: 0
                });
            }
        } else {
            // Check if Honors - Sync Logic
            const isHonors = data.category === 'honour' || (semesterInfo.honors || []).some(h => h.code === sel.code);
            const globalKey = `${year}_${semester}_${sel.code}`;
            const syncedSlots = isHonors ? globalHonorsSlots[globalKey] : null;

            if (syncedSlots && Array.isArray(syncedSlots)) {
                // Case 1: Already Synced (Follow Leader)
                // Enforce these slots rigidly
                syncedSlots.forEach(ss => {
                    let assignedStaff = 'TBD';
                    const sectionStaff = getSectionStaff(data.staffConfig, section);
                    for (const staff of sectionStaff) {
                        if (isStaffFree(staff, ss.day, ss.slot, timetable) && isResourceFree(data.code, ss.day, ss.slot)) {
                            assignedStaff = staff;
                            break;
                        }
                    }
                    if (!assignedStaff || assignedStaff === 'TBD') assignedStaff = 'TBD';

                    bookResource(assignedStaff, data.code, ss.day, ss.slot);
                    timetable[ss.day].push({
                        slot: ss.slot,
                        code: data.code,
                        name: data.name,
                        staff: assignedStaff,
                        isFixed: true,
                        type: data.type
                    });
                });
                // Skip allocateList
            } else {
                // Case 2: Not Synced OR Normal Subject
                const periodType = sel.periodType || 'non-continuous';
                let ruleOverride = { ...data.academicRule };
                let typeOverride = data.type;

                // Apply User Overrides
                if (periodType === 'continuous') {
                    typeOverride = 'lab'; // Force block logic
                    ruleOverride.continuous = true;
                    if (sel.continuousCount) {
                        ruleOverride.periodsPerWeek = sel.continuousCount;
                    }
                } else {
                    // Ensure non-continuous strictly enforces separate days if theory
                    ruleOverride.continuous = false;
                }

                allocateList.push({
                    ...data,
                    fixedDay: sel.fixedDay,
                    fixedSlot: sel.fixedSlot,
                    type: typeOverride,
                    academicRule: ruleOverride,
                    allocatedCount: 0,
                    isHonors: isHonors
                });
            }
        }
    });

    // Inject Essential Floating Subjects if missing (PT, LIB, APT)
    // Only inject if not already present in some form (to avoid duplicates like GE2251 Aptitude)
    const hasAptitude = allocateList.some(s => s.name.toLowerCase().includes('aptitude') || s.code === 'APT');
    const hasLibrary = allocateList.some(s => s.name.toLowerCase().includes('library') || s.code === 'LIB');
    const hasPT = allocateList.some(s => s.name.toLowerCase().includes('physical training') || s.code === 'PT');

    if (!hasAptitude) {
        allocateList.push({
            code: 'APT',
            name: 'Aptitude',
            type: 'theory',
            academicRule: { periodsPerWeek: 1, continuous: false },
            staffConfig: { primary: ['Placement Cell'], substitute: [] },
            allocatedCount: 0,
            fixedDay: null,
            fixedSlot: null
        });
    }
    if (!hasLibrary) {
        allocateList.push({
            code: 'LIB',
            name: 'Library',
            type: 'theory',
            academicRule: { periodsPerWeek: 1, continuous: false },
            staffConfig: { primary: ['Librarian'], substitute: [] },
            allocatedCount: 0,
            fixedDay: null,
            fixedSlot: null
        });
    }
    if (!hasPT) {
        allocateList.push({
            code: 'PT',
            name: 'Physical Training',
            type: 'theory',
            academicRule: { periodsPerWeek: 1, continuous: false },
            staffConfig: { primary: ['Physical Instructor'], substitute: [] },
            allocatedCount: 0,
            fixedDay: null,
            fixedSlot: null
        });
    }

    // 3. Place User-Defined Fixed Slots
    // Priority: User Override
    allocateList.forEach(sub => {
        if (sub.fixedDay && sub.fixedSlot) {
            // Validate: Is it a Global Fixed Slot?
            const isGlobalConflict = GLOBAL_SLOTS.some(g => g.day === sub.fixedDay && g.slot === sub.fixedSlot);
            if (isGlobalConflict) {
                // We CANNOT override global slots like GEAR or Counseling
                // Exception: If the user IS the global slot? No, this list is for academic subjects.
                throw new Error(`Conflict: ${sub.fixedDay} Period ${sub.fixedSlot} is reserved for Global Activities (GEAR/Counselling). Cannot place ${sub.code}.`);
            }

            // Remove existing (should be empty usually if sorted right, but safety first)
            const existingIdx = timetable[sub.fixedDay].findIndex(s => s.slot === sub.fixedSlot);
            if (existingIdx !== -1) {
                // Check what occupied it? If it was another fixed subject, we have a double booking config error.
                // If it was a global placed slot (GEAR), we already checked above.
                // If it was validly empty, we clear it.
                timetable[sub.fixedDay].splice(existingIdx, 1);
            }

            // Assign Staff with Strict Validation
            let assignedStaff = null;
            let conflictReason = "";

            // Get section-specific staff
            const sectionStaff = getSectionStaff(sub.staffConfig, section);
            const sectionSubstitute = getSectionStaff({ primary: sub.staffConfig.substitute || [] }, section);

            // 1. Try Primary (Section-Specific)
            for (const staff of sectionStaff) {
                if (!isStaffFree(staff, sub.fixedDay, sub.fixedSlot, timetable)) {
                    conflictReason = `Primary Staff ${staff} is busy in another section.`;
                    continue;
                }
                if (!isSlotFree(sub.fixedDay, sub.fixedSlot, sub.code)) {
                    conflictReason = `Slot ${sub.fixedDay} Period ${sub.fixedSlot} is reserved for an Honour subject.`;
                    continue;
                }
                if (!isResourceFree(sub.code, sub.fixedDay, sub.fixedSlot)) {
                    conflictReason = `Subject Resource ${sub.code} is busy in another section.`;
                    continue;
                }
                assignedStaff = staff;
                break;
            }

            // 2. Try Substitute (Section-Specific)
            if (!assignedStaff) {
                for (const staff of sectionSubstitute) {
                    if (isStaffFree(staff, sub.fixedDay, sub.fixedSlot, timetable) && isResourceFree(sub.code, sub.fixedDay, sub.fixedSlot)) {
                        assignedStaff = staff;
                        break;
                    }
                }
            }

            // If still no staff, FAIL user request? 
            // "If still impossible -> show a clear validation error."
            // Usually TBD is last resort. But for Fixed, user DEMANDS this slot. 
            // If the staff is busy, we can't clone them.
            if (!assignedStaff) {
                // Check if we can use TBD?
                // If resource is free but staff busy -> TBD is okay? 
                // "Mark it as a conflict... If still impossible -> show a clear validation error."
                // Usually TBD is last resort. But for Fixed, user DEMANDS this slot. 
                // If the staff is busy, we can't clone them.

                // Let's check resource availability at least.
                if (!isResourceFree(sub.code, sub.fixedDay, sub.fixedSlot)) {
                    throw new Error(`Conflict: Subject ${sub.code} is already running in another section at ${sub.fixedDay} Period ${sub.fixedSlot}.`);
                }

                // If resource is free, but staff isn't... we throw error.
                throw new Error(`Conflict: All assigned staff for ${sub.code} are busy at ${sub.fixedDay} Period ${sub.fixedSlot}. Please choose another slot or staff.`);
            }

            // Book It
            bookResource(assignedStaff, sub.code, sub.fixedDay, sub.fixedSlot);

            timetable[sub.fixedDay].push({
                slot: sub.fixedSlot,
                code: sub.code,
                name: sub.name,
                staff: assignedStaff,
                isFixed: true,
                type: sub.type
            });
            sub.allocatedCount += 1;

            // Handle Continuous Extension from Fixed Start
            if (sub.academicRule.continuous) {
                const duration = sub.academicRule.periodsPerWeek;
                // Place subsequent periods
                for (let k = 1; k < duration; k++) {
                    const nextSlot = sub.fixedSlot + k;
                    if (nextSlot > 8) {
                        throw new Error(`Configuration Error: Continuous block for ${sub.code} starting at Period ${sub.fixedSlot} goes beyond valid periods.`);
                    }
                    if (nextSlot === 5 && sub.fixedSlot <= 4) {
                        // Crossing Lunch Break? Usually discouraged but maybe allowed in manual fixed?
                        // Assuming strictly NO crossing lunch if auto-generated, but USER fixed? 
                        // "Lunch: 12:50 - 01:30". Period 4 ends 12:50. Period 5 starts 01:30.
                        // It is a break. Continous labs usually shouldn't bridge it.
                        // But if user fixed it... let's warn or error? 
                        // Logic Rule 315: "if start <= 4 and start + blockSize - 1 > 4 continue".
                        // We should enforce this.
                        throw new Error(`Configuration Error: Continuous block for ${sub.code} crosses Lunch Break.`);
                    }

                    // Check Global Conflict for next slot
                    if (GLOBAL_SLOTS.some(g => g.day === sub.fixedDay && g.slot === nextSlot)) {
                        throw new Error(`Conflict: Continuous block extends into Global Slot at Period ${nextSlot}.`);
                    }

                    const eIdx = timetable[sub.fixedDay].findIndex(s => s.slot === nextSlot);
                    if (eIdx !== -1) timetable[sub.fixedDay].splice(eIdx, 1);

                    // Check Staff/Resource consistency for block
                    if (!isStaffFree(assignedStaff, sub.fixedDay, nextSlot, timetable, true)) {
                        throw new Error(`Conflict: Staff ${assignedStaff} is busy at ${sub.fixedDay} Period ${nextSlot} (during continuous block).`);
                    }
                    if (!isResourceFree(sub.code, sub.fixedDay, nextSlot)) {
                        throw new Error(`Conflict: Subject ${sub.code} is busy in another section at Period ${nextSlot}.`);
                    }

                    bookResource(assignedStaff, sub.code, sub.fixedDay, nextSlot);
                    timetable[sub.fixedDay].push({
                        slot: nextSlot,
                        code: sub.code,
                        name: sub.name,
                        staff: assignedStaff,
                        type: sub.type
                    });
                    sub.allocatedCount += 1;
                }
            }
        }
    });

    // 4. Sort Remaining
    allocateList.sort((a, b) => {
        // Labs first
        if (a.type === 'lab' && b.type !== 'lab') return -1;
        if (a.type !== 'lab' && b.type === 'lab') return 1;
        // Then by required periods desc
        return b.academicRule.periodsPerWeek - a.academicRule.periodsPerWeek;
    });

    // 5. Allocation Loop
    const unplacedSubjects = []; // Track failures

    allocateList.forEach(sub => {
        // HARDENING: Force integer for periods
        const required = parseInt(sub.academicRule.periodsPerWeek, 10) || 0;
        let needed = required - (sub.allocatedCount || 0);

        if (needed <= 0) return;

        // LAB Allocation (Block)
        if (sub.type === 'lab' || sub.academicRule.continuous) {
            const blockSize = needed; // Usually allocate strict blocks for labs

            // Try to find a valid block
            let placed = false;
            const shuffledDays = [...DAYS].sort(() => 0.5 - Math.random());

            for (const day of shuffledDays) {
                if (placed) break;
                // If it's a split lab (2 periods), can fit in more places.
                // Standard Lab (4 periods): Starts 1, 2, 3, 5
                const possibleStarts = blockSize === 4 ? [1, 5] : [1, 2, 3, 5, 6, 7];

                for (const start of possibleStarts) {
                    if (start + blockSize - 1 > 8) continue;
                    if (start <= 4 && start + blockSize - 1 > 4) continue; // Lunch break constraint

                    // Check Slots
                    let fits = true;
                    for (let k = 0; k < blockSize; k++) {
                        if (!isSlotFree(day, start + k, sub.code)) { fits = false; break; }
                    }
                    if (!fits) continue;

                    // Check Staff (Primary Lead - Section Specific)
                    let assignedStaff = null;
                    const sectionStaff = getSectionStaff(sub.staffConfig, section);
                    for (const staff of sectionStaff) {
                        let resourceAndStaffFree = true;
                        for (let k = 0; k < blockSize; k++) {
                            if (!isStaffFree(staff, day, start + k, timetable, true) || !isResourceFree(sub.code, day, start + k)) {
                                resourceAndStaffFree = false;
                                break;
                            }
                        }
                        if (resourceAndStaffFree) {
                            assignedStaff = staff;
                            break;
                        }
                    }

                    // Fallback: If no staff found, but slot/resource is free, force allocation (TBD)
                    if (!assignedStaff) {
                        let resourceFree = true;
                        for (let k = 0; k < blockSize; k++) {
                            if (!isResourceFree(sub.code, day, start + k)) {
                                resourceFree = false;
                                break;
                            }
                        }
                        if (resourceFree) {
                            assignedStaff = "TBD";
                        }
                    }

                    if (assignedStaff) {
                        // Allocate Block
                        for (let k = 0; k < blockSize; k++) {
                            const currentSlot = start + k;
                            bookResource(assignedStaff, sub.code, day, currentSlot);
                            timetable[day].push({
                                slot: currentSlot,
                                code: sub.code,
                                name: sub.name,
                                staff: assignedStaff,
                                type: 'lab'
                            });
                        }
                        placed = true;
                        needed -= blockSize;
                        break;
                    }
                }
            }
        }

        // THEORY Allocation (Single)
        while (needed > 0) {
            let placed = false;
            const shuffledDays = [...DAYS].sort(() => 0.5 - Math.random());

            for (const day of shuffledDays) {
                if (placed) break;
                // Max 1 period/day check
                if (timetable[day].some(s => s.code === sub.code)) continue;

                // Try slots 1-8
                for (const slot of SLOTS) {
                    if (isSlotFree(day, slot, sub.code)) {
                        // Check Staff (Section-Specific)
                        let assignedStaff = null;
                        const sectionStaff = getSectionStaff(sub.staffConfig, section);
                        const sectionSubstitute = getSectionStaff({ primary: sub.staffConfig.substitute || [] }, section);

                        // Try primary staff first
                        for (const staff of sectionStaff) {
                            if (isStaffFree(staff, day, slot, timetable, false) && isResourceFree(sub.code, day, slot)) {
                                assignedStaff = staff;
                                break;
                            }
                        }

                        // Try substitute staff if no primary available
                        if (!assignedStaff) {
                            for (const staff of sectionSubstitute) {
                                if (isStaffFree(staff, day, slot, timetable, false) && isResourceFree(sub.code, day, slot)) {
                                    assignedStaff = staff;
                                    break;
                                }
                            }
                        }

                        // Fallback: TBD if resource is free
                        if (!assignedStaff) {
                            if (isResourceFree(sub.code, day, slot)) {
                                assignedStaff = "TBD";
                            }
                        }

                        if (assignedStaff) {
                            bookResource(assignedStaff, sub.code, day, slot);
                            timetable[day].push({
                                slot,
                                code: sub.code,
                                name: sub.name,
                                staff: assignedStaff,
                                type: 'theory'
                            });
                            placed = true;
                            needed--;
                            break;
                        }
                    }
                }
            }
            if (!placed) break; // Cannot place
        }

        // Check if failed to place completely
        if (needed > 0) {
            unplacedSubjects.push({
                code: sub.code,
                name: sub.name,
                missing: needed,
                total: required,
                reason: sub.type === 'lab' ? 'No continuous block found' : 'No valid slot/staff found'
            });
        }
    });

    // 6. Sort & Fill Empty with Library/Revision (Optionally) or leave Empty
    // User Requirement: "All other cells must remain EMPTY" (Initially). 
    // "Regenerate... Reassigns Remaining periods".
    // "Timetable fills correctly".
    // Usually a timetable shouldn't have holes. Gaps are usually filled with Library.
    // The requirement "All other cells must remain EMPTY" referred to the "Initial State" BEFORE generation.
    // AFTER generation, gaps are bad. But if the algorithm can't fill them, they are empty.

    // Final Sort
    DAYS.forEach(day => {
        timetable[day].sort((a, b) => a.slot - b.slot);

        // Save Honors Allocation
        timetable[day].forEach(slot => {
            const isHonors = (semesterInfo.honors || []).some(h => h.code === slot.code) ||
                (semesterInfo.subjects || []).find(s => s.code === slot.code)?.category === 'honour';
            if (isHonors) {
                const globalKey = `${year}_${semester}_${slot.code}`;
                if (!Array.isArray(globalHonorsSlots[globalKey])) {
                    globalHonorsSlots[globalKey] = [];
                }

                if (!globalHonorsSlots[globalKey].some(s => s.day === day && s.slot === slot.slot)) {
                    globalHonorsSlots[globalKey].push({ day: day, slot: slot.slot });
                }
            }
        });
    });

    // Save Global State
    // Save Global State
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem('timetable_global_staff_usage', JSON.stringify(globalStaffUsage));
            localStorage.setItem('timetable_global_subject_usage', JSON.stringify(globalSubjectUsage));
            localStorage.setItem('timetable_global_honors', JSON.stringify(globalHonorsSlots));
        } catch (e) { console.error(e); }
    }

    // Generate staff mapping for display
    const staffMapping = generateStaffMapping(timetable, section);

    return {
        timetable,
        staffMapping,
        unplacedSubjects // Return failures for UI reporting
    };
};
