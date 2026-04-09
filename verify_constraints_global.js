
import { generateTimetable } from './src/utils/timetableGenerator.js';

// 1. Mock LocalStorage
const store = {};
global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; }
};

// 2. Setup Test Data
const staffName = "Mr. Test";
const globalContext = "II CSE A"; // context for "other" section

// We will use different days for different rules to be clear.

// Rule 1: CLASH TEST (Wednesday)
// Mr. Test is busy globally on Wednesday Slot 1.
// We expect him NOT to be assigned Wednesday Slot 1 locally.
const clashDay = "Wednesday";
const clashSlot = 1;

// Rule 2: DAILY LIMIT TEST (Monday)
// Mr. Test has 4 slots globally on Monday (Slots 1, 2, 3, 4).
// We expect him NOT to be assigned ANY more slots on Monday.
const dailyLimitDay = "Monday";

// Rule 3: CONTINUITY TEST (Tuesday)
// Mr. Test has Tuesday Slot 2 globally.
// We expect he can get Slot 1 (1-2 is 2 continuous - OK)
// OR Slot 3 (2-3 is 2 continuous - OK)
// BUT NOT Slot 1 AND Slot 3 (1-2-3 is 3 continuous - FAIL)
// Let's force a scenario where we demand CONTINUOUS block.
const continuityDay = "Tuesday";

const globalUsage = {};

// Setup Clash
globalUsage[`${clashDay}_${clashSlot}_${staffName}`] = globalContext;

// Setup Daily Limit
[1, 2, 3, 4].forEach(slot => {
    globalUsage[`${dailyLimitDay}_${slot}_${staffName}`] = globalContext;
});

// Setup Continuity (Base)
globalUsage[`${continuityDay}_2_${staffName}`] = globalContext;

localStorage.setItem('timetable_global_staff_usage', JSON.stringify(globalUsage));

console.log("=== Verification Test Setup ===");
console.log(`1. Clash Check: ${staffName} is busy ${clashDay} Period ${clashSlot} (Global).`);
console.log(`2. Daily Limit: ${staffName} has 4 periods on ${dailyLimitDay} (Global).`);
console.log(`3. Continuity : ${staffName} has Period 2 on ${continuityDay} (Global).`);
console.log("===============================");

// 3. Define Config for Generation
const year = "I";
const semester = "1";

const config = {
    year,
    semester,
    section: 'B',
    subjects: [
        {
            code: 'TEST_SUB',
            name: 'Test Subject',
            staffConfig: { primary: [staffName], substitute: [] },
            academicRule: { periodsPerWeek: 15, continuous: false }, // Request MANY periods to force collisions
            type: 'theory'
        }
    ]
};

// Mock Subject Data
const mockSubjectData = {
    [year]: {
        [semester]: {
            subjects: config.subjects,
            honors: []
        }
    }
};

// 4. Run Generation
console.log("\nRunning Generator...");
try {
    const result = generateTimetable(config, mockSubjectData);
    const timetable = result.timetable;

    console.log("\n=== Test Results ===");

    // TEST 1: CLASH
    const wedSlot1 = timetable[clashDay].find(s => s.slot === clashSlot);
    const assignedStaff = wedSlot1 ? wedSlot1.staff : 'FREE';
    console.log(`[Rule 1: Clash] ${clashDay} Period ${clashSlot} assigned to: ${assignedStaff}`);

    if (assignedStaff === staffName) {
        console.error("FAIL: Staff assigned despite global clash!");
    } else {
        console.log("PASS: Staff NOT assigned to busy slot.");
    }

    // TEST 2: DAILY LIMIT
    const monSlots = timetable[dailyLimitDay].filter(s => s.staff === staffName);
    console.log(`[Rule 2: Daily Limit] ${staffName} assignments on ${dailyLimitDay}: ${monSlots.length}`);

    // He already has 4 global. Should get 0 local.
    if (monSlots.length > 0) {
        console.error("FAIL: Daily limit exceeded (4 Global + " + monSlots.length + " Local).");
    } else {
        console.log("PASS: Daily limit respected (0 new assignments).");
    }

    // TEST 3: CONTINUITY
    const tueSlots = timetable[continuityDay].filter(s => s.staff === staffName).map(s => s.slot);
    // Combine with global (Slot 2)
    const allTueSlots = [...new Set([2, ...tueSlots])].sort((a, b) => a - b);
    console.log(`[Rule 3: Continuity] ${staffName} Slots on ${continuityDay} (Global+Local): [${allTueSlots.join(', ')}]`);

    let maxCont = 1;
    let currCont = 1;
    for (let i = 1; i < allTueSlots.length; i++) {
        if (allTueSlots[i] === allTueSlots[i - 1] + 1) {
            currCont++;
            maxCont = Math.max(maxCont, currCont);
        } else {
            currCont = 1;
        }
    }
    console.log(`Max Continuous Block Size: ${maxCont}`);

    if (maxCont > 2) {
        console.error("FAIL: Continuity constraint violated (>2 continuous).");
    } else {
        console.log("PASS: Continuity constraint respected (Max <= 2).");
    }

} catch (e) {
    console.error("Error during generation:", e);
}
