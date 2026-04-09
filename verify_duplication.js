
// Verification script to reproduce history duplication
// Mocks: localStorage, fetch

// Mock LocalStorage
const mockLocalStorage = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
global.window = { localStorage: mockLocalStorage };

// Mock Timetable Generation and Save Logic (Simulating TimetableView.jsx + dataStore.js)

// --- DATA STORE MOCK ---
const saveTimetable = async (config, timetable, existingId = null) => {
    // console.log(`[Save] ExistingID: ${existingId}, Config: ${config.section}`);

    const dataToSave = {
        config,
        timetable,
        timestamp: new Date().toISOString(),
        _id: existingId || 'local_' + Date.now() + Math.random() // Unique ID
    };

    // Save to LocalStorage History (Upsert Logic to Test)
    const currentHistory = JSON.parse(mockLocalStorage.getItem('timetable_history_backup') || '[]');

    if (existingId) {
        // Update existing
        const index = currentHistory.findIndex(item => item._id === existingId);
        if (index !== -1) {
            currentHistory[index] = dataToSave;
            // console.log(`[Store] Updated existing entry ${existingId}`);
        } else {
            // ID provided but not found? Append.
            currentHistory.unshift(dataToSave);
            // console.log(`[Store] ID ${existingId} not found, appending.`);
        }
    } else {
        // New Item
        currentHistory.unshift(dataToSave);
        // console.log(`[Store] Created new entry ${dataToSave._id}`);
    }

    // Limit to last 20
    const trimmed = currentHistory.slice(0, 20);
    mockLocalStorage.setItem('timetable_history_backup', JSON.stringify(trimmed));

    return { success: true, mode: 'online', _id: dataToSave._id };
};

// --- COMPONENT MOCK (TimetableView.jsx) ---
const simulateComponent = async () => {
    console.log("--- Simulation Start ---");

    // 1. Initial State
    // Simulating 2 sections (A and B) generated at once
    const configs = [
        { section: 'A', subjects: ['Math'] },
        { section: 'B', subjects: ['Science'] }
    ];
    let savedIds = {};

    // 2. Auto-Save (Effect)
    console.log("--- Auto Saving ---");
    const autoSavePromises = configs.map(async (conf, i) => {
        const res = await saveTimetable(conf, {}, null); // Pass null initially
        if (res._id) savedIds[i] = res._id;
        return res;
    });
    await Promise.all(autoSavePromises);

    console.log("Saved IDs after Auto-Save:", savedIds);

    // 3. User Clicks "Save All" immediately (maybe before state update fully propogated, but here it's sync in simulation)
    // BUT what if there is a flaw in how savedIds is READ during the manual save?
    // In React setState is async. If 'savedIds' var in the closure is OLD?

    // Let's simulate a manual save where we *think* we have IDs (ideal case)
    // AND simulate a manual save where we DON'T have IDs (race condition case)

    console.log("--- Manual Save (Ideal) ---");
    await Promise.all(configs.map(async (conf, i) => {
        const existingId = savedIds[i]; // Using captured ID
        await saveTimetable(conf, {}, existingId);
    }));

    // Check History Count (Ideal)
    let history = JSON.parse(mockLocalStorage.getItem('timetable_history_backup') || '[]');
    console.log(`History Count (Ideal): ${history.length} (Expected: 2)`);
    // Should be exactly 2 (A and B), no duplicates.

    // --- Manual Save (Race Condition Simulation) ---
    // User clicks save *before* auto-save finishes or setSavedIds triggers re-render?
    // Or if handling multiple sections, key mismatch?

    console.log("--- Manual Save (Race Condition: Missing IDs) ---");
    await Promise.all(configs.map(async (conf, i) => {
        // Simulating closure capturing OLD empty savedIds
        const existingId = null;
        await saveTimetable(conf, {}, existingId);
    }));

    history = JSON.parse(mockLocalStorage.getItem('timetable_history_backup') || '[]');
    console.log(`History Count (Race Condition): ${history.length} (Expected: 2, Actual: ${history.length})`);

    // Print Titles/Timestamps to verify duplicates
    history.forEach(h => console.log(`Entry: Section ${h.config.section}, ID: ${h._id}`));
};

simulateComponent();
