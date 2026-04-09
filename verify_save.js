
import { saveTimetable } from './src/utils/dataStore.js';

// 1. Mock LocalStorage
const store = {};
global.window = { localStorage: {} }; // Mock window for checks
global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
        store[key] = value;
        console.log(`[LocalStorage] Set ${key}:`, value.substring(0, 50) + "...");
    },
    removeItem: (key) => { delete store[key]; }
};

// 2. Mock Fetch (Database API)
global.fetch = async (url, options) => {
    console.log(`[API] Fetch called: ${options.method} ${url}`);
    if (url.includes('/api/timetable') && options.method === 'POST') {
        return {
            ok: true,
            json: async () => ({ success: true, id: 'db_123' })
        };
    }
    throw new Error("Unexpected API call");
};

// Mock AbortController for fetchWithTimeout
global.AbortController = class {
    constructor() { this.signal = {}; }
    abort() { }
};


// 3. Test Data
const config = { year: 'I', section: 'A' };
const timetable = { Monday: [] };

// 4. Run Verification
async function runTest() {
    console.log("--- Starting Save Verification ---");

    // Clear Store
    store['timetable_history_backup'] = '[]';

    // Step A: Save New
    console.log("\n1. Saving New Timetable...");
    const res1 = await saveTimetable(config, timetable, null);

    // Verify LocalStorage
    const history1 = JSON.parse(store['timetable_history_backup']);
    if (history1.length === 1) {
        console.log("PASS: Local History updated (Count: 1).");
    } else {
        console.error("FAIL: Local History not updated.");
    }

    // Verify Return ID
    if (res1._id) {
        console.log(`PASS: Returned ID: ${res1._id}`);
    } else {
        console.error("FAIL: No ID returned.");
    }

    // Step B: Save Update (simulate "Save All" again)
    console.log("\n2. Updating Existing Timetable...");
    const res2 = await saveTimetable(config, timetable, res1._id);

    // Verify LocalStorage (Should still be 1, but updated)
    const history2 = JSON.parse(store['timetable_history_backup']);
    if (history2.length === 1) {
        console.log("PASS: Local History deduped (Count is still 1).");
    } else {
        console.error(`FAIL: Local History duplicated (Count: ${history2.length}).`);
    }

    if (res1._id === res2._id) {
        console.log("PASS: ID preserved.");
    } else {
        console.error("FAIL: ID changed (Duplicate created?).");
    }
}

runTest();
