import { subjectData as staticData } from '../data/subjectData.js';
import { staffMembers as staticStaff } from '../data/staffMembers.js';
import { academicCalendar as defaultAcademicCalendar } from '../data/academicCalendar.js';

const API_BASE_URL = 'http://localhost:5000/api';

// Helper: Fetch with Timeout
const fetchWithTimeout = async (url, options = {}, timeout = 2000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

// Helper: Deep Merge
const deepMerge = (target, source) => {
    const output = { ...target };
    if (!source) return output;

    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!output[key]) Object.assign(output, { [key]: {} });
            output[key] = deepMerge(output[key], source[key]);
        } else {
            Object.assign(output, { [key]: source[key] });
        }
    });
    return output;
};

// 1. Fetch Subject Data (Async)
export const fetchUnifiedSubjectData = async () => {
    let merged = JSON.parse(JSON.stringify(staticData));
    let customData = null;

    // Try MongoDB API First
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/subjects`);
        if (response.ok) {
            customData = await response.json();
            console.log("Loaded data from MongoDB");
        } else {
            console.warn("MongoDB fetch failed:", response.statusText);
        }
    } catch (e) {
        console.error("API fetch failed, falling back to LocalStorage:", e.name === 'AbortError' ? 'Timeout' : e);
    }

    // Fallback to LocalStorage
    if (!customData && typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('custom_subjects');
        if (stored) {
            try {
                customData = JSON.parse(stored);
                console.log("Loaded data from LocalStorage");
            } catch (e) { console.error(e); }
        }
    }

    // Merge if we found custom data
    if (customData) {
        merged = deepMerge(merged, customData);
    }

    return merged;
};

// 2. Save Subject Data (Async)
export const saveUnifiedSubjectData = async (data) => {
    // Save to LocalStorage (Immediate Backup)
    if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('custom_subjects', JSON.stringify(data));
        window.dispatchEvent(new Event('subjectDataUpdated'));
    }

    // Save to MongoDB (Async)
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, 3000); // Slightly longer for POST
        if (!response.ok) throw new Error('API Save Failed');
        console.log("Saved data to MongoDB");
    } catch (e) {
        console.error("MongoDB save failed:", e);
        // We don't throw here to avoid blocking UI flow on network error, since LocalStorage is updated.
        // But throwing allows the UI to show a warning.
        throw e;
    }
};

// 3. Timetable Sync (Async)
export const fetchLatestTimetable = async (publishedOnly = false) => {
    let timetableData = null;

    try {
        const query = publishedOnly ? '?published=true' : '';
        const response = await fetchWithTimeout(`${API_BASE_URL}/timetable/latest${query}`);
        if (response.ok) {
            timetableData = await response.json();
        }
    } catch (e) {
        console.error("API timetable fetch failed:", e.name === 'AbortError' ? 'Timeout' : e);
    }

    if (!timetableData && typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('last_saved_timetable');
        if (saved) {
            try {
                // If filtering by published, checking local storage is tricky as we might not store that flag properly on legacy data
                // but for now, we return it if it matches or if we ignore filter.
                // Ideally, we depend on API for published data.
                timetableData = JSON.parse(saved);
                if (publishedOnly && !timetableData.isPublished) {
                    timetableData = null; // Filter out if not published
                }
            } catch (e) { }
        }
    }

    return timetableData;
};

export const fetchTimetableHistory = async (publishedOnly = false) => {
    let history = [];

    // 1. Try API
    try {
        const query = publishedOnly ? '&published=true' : '';
        const response = await fetchWithTimeout(`${API_BASE_URL}/timetables?ts=${Date.now()}${query}`);
        if (response.ok) {
            history = await response.json();
            // Optional: Sync back to local? or prefer API
        }
    } catch (e) {
        console.error("API history fetch failed:", e.name === 'AbortError' ? 'Timeout' : e);
    }

    // 2. LocalStorage Fallback (Merge or return if API failed)
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const localHistory = JSON.parse(localStorage.getItem('timetable_history_backup') || '[]');
            // Merge logic: Deduplicate by ID or Timestamp? 
            // Simple approach: Use local if API failed or empty
            if (history.length === 0) {
                history = localHistory.filter(item => !publishedOnly || item.isPublished);
                console.log("Loaded history from LocalStorage");
            }
        } catch (e) { console.error(e); }
    }

    return history;
};

export const fetchTimetableById = async (id) => {
    // Try API
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/timetable/${id}?ts=${Date.now()}`);
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("API fetch by id failed:", e.name === 'AbortError' ? 'Timeout' : e);
    }

    // Try LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const localHistory = JSON.parse(localStorage.getItem('timetable_history_backup') || '[]');
            const found = localHistory.find(item => item._id === id || item.timestamp === id); // Simplify ID match
            if (found) return found;
        } catch (e) { }
    }

    return null;
};

// Update saveTimetable to allow isPublished
export const saveTimetable = async (config, timetable, existingId = null, isPublished = false) => {
    const dataToSave = {
        config,
        timetable,
        timestamp: new Date().toISOString(),
        _id: existingId || 'local_' + Date.now(), // Use existing or create new
        isPublished: !!isPublished
    };

    // Save to LocalStorage History (Upsert)
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            localStorage.setItem('last_saved_timetable', JSON.stringify(dataToSave));

            const currentHistory = JSON.parse(localStorage.getItem('timetable_history_backup') || '[]');

            if (existingId) {
                // Update existing
                const index = currentHistory.findIndex(item => item._id === existingId);
                if (index !== -1) {
                    currentHistory[index] = dataToSave;
                } else {
                    // ID provided but not found? Append.
                    currentHistory.unshift(dataToSave);
                }
            } else {
                // New Item
                currentHistory.unshift(dataToSave);
            }

            // Limit to last 20
            const trimmed = currentHistory.slice(0, 20);
            localStorage.setItem('timetable_history_backup', JSON.stringify(trimmed));
        } catch (e) {
            console.error("Local history save failed (Quota Exceeded?)", e);
            // We can continue even if local save fails, or treat as partial error.
        }
    }

    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/timetable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        }, 5000);
        if (!response.ok) throw new Error('API Save Failed');
        console.log("Timetable saved to MongoDB");

        const savedData = await response.json();
        // Backend now returns { ... _id: doc._id }
        const serverId = savedData._id || savedData.result?.insertedId || dataToSave._id;

        // CRITICAL: Anytime we save, we should ideally trigger a re-sync of global usage
        // But for now, we'll let the Generator handle it on its next run.

        return { success: true, mode: 'online', _id: serverId };
    } catch (e) {
        console.error("MongoDB timetable save failed:", e.name === 'AbortError' ? 'Timeout' : e);
        return { success: false, mode: 'offline', _id: dataToSave._id };
    }
};

export const saveTimetableBatch = async (batchItems, isPublished = false) => {
    // 1. Local Backup (Individual items)
    batchItems.forEach(item => {
        const key = `timetable_${item.config.year}_${item.config.section}`;
        const data = {
            config: item.config,
            timetable: item.timetable,
            timestamp: new Date().toISOString(),
            isPublished: !!isPublished
        };
        localStorage.setItem(key, JSON.stringify(data));
        item.isPublished = !!isPublished; // Append to item for API
    });

    // 2. Batch Transactional API Save
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/timetable/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: batchItems })
        }, 30000); // 30s for transaction

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Batch Save Failed');
        }

        console.log("Batch saved to MongoDB atomically");
        return await response.json();
    } catch (e) {
        console.error("MongoDB batch save failed:", e);
        throw e;
    }
};

// 5. Global Usage Aggregator (CRITICAL for conflict detection)
// Rebuilds usage maps from ALL saved timetables in DB
export const rebuildGlobalUsageMaps = async () => {
    try {
        // We need the ACTUAL timetable data, so we fetch all full docs
        // Optimization: In a huge system, we'd have a dedicated /api/usage endpoint
        // For this project, we'll fetch them all.
        const response = await fetch(`${API_BASE_URL}/timetables_full`); // We need to add this endpoint
        if (!response.ok) throw new Error("Failed to fetch all timetables");

        const allTimetables = await response.json();
        const globalStaffUsage = {};
        const globalSubjectUsage = {};
        const globalHonors = {};

        allTimetables.forEach(doc => {
            const { config, timetable } = doc;
            const contextKey = `${config.year}_${config.section}`;

            Object.entries(timetable).forEach(([day, slots]) => {
                slots.forEach(slotItem => {
                    const { slot, code, staff } = slotItem;

                    // 1. Staff Usage
                    if (staff && staff !== 'TBD' && staff !== 'Coordinator' && staff !== 'Counselling Team') {
                        const staffKey = `${day}_${slot}_${staff}`;
                        globalStaffUsage[staffKey] = contextKey;
                    }

                    // 2. Subject Usage (Shared Labs etc)
                    if (code) {
                        const subjectKey = `${day}_${slot}_${code}`;
                        globalSubjectUsage[subjectKey] = contextKey;
                    }
                });
            });
        });

        // Save back to LocalStorage for the Generator to pick up
        localStorage.setItem('timetable_global_staff_usage', JSON.stringify(globalStaffUsage));
        localStorage.setItem('timetable_global_subject_usage', JSON.stringify(globalSubjectUsage));

        return { globalStaffUsage, globalSubjectUsage };
    } catch (err) {
        console.error("Failed to rebuild usage maps:", err);
        return null;
    }
};

// 4. Staff Sync (Async)
export const fetchLatestStaff = async () => {
    let staffData = null;

    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/staff`);
        if (response.ok) {
            staffData = await response.json();
        }
    } catch (e) {
        console.error("API staff fetch failed:", e.name === 'AbortError' ? 'Timeout' : e);
    }

    // Fallback
    if ((!staffData || staffData.length === 0) && typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('timetable_staff_list');
        if (saved) {
            try {
                staffData = JSON.parse(saved);
            } catch (e) { }
        }
    }

    return staffData || staticStaff;
};

export const saveStaffList = async (members) => {
    let mode = 'online';

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            localStorage.setItem('timetable_staff_list', JSON.stringify(members));
        } catch (e) {
            console.error("Local staff save failed (Quota Exceeded?)", e);
            // If local save fails, we still try cloud. 
            // If both fail, caller catches exception.
        }
    }

    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(members)
        }, 5000); // Increased timeout for images
        if (!response.ok) throw new Error('API Save Failed');
        console.log("Staff list saved to MongoDB");
    } catch (e) {
        console.error("MongoDB staff save failed:", e);
        mode = 'offline';

        // Check if we successfully saved locally
        const localSuccess = (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('timetable_staff_list'));

        if (localSuccess) {
            return { success: true, mode: 'offline' };
        } else {
            return { success: false, error: "Both Cloud and Local Save Failed" };
        }
    }
    return { success: true, mode: 'online' };
};

// Legacy Sync Support (Deprecated)
export const getUnifiedSubjectData = () => {
    let merged = JSON.parse(JSON.stringify(staticData));
    if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('custom_subjects');
        if (stored) {
            try {
                const customData = JSON.parse(stored);
                merged = deepMerge(merged, customData);
            } catch (e) { }
        }
    }
    return merged;
};

// ==============================================
// 4. ACADEMIC CALENDAR MANAGEMENT (NEW)
// ==============================================

export const getAcademicCalendar = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem('academic_calendar');
            if (stored) {
                return JSON.parse(stored);
            }
        }
    } catch (e) {
        console.error("Failed to parse local calendar data:", e);
    }
    // Return statically bundled default if local store is empty
    return defaultAcademicCalendar;
};

export const saveAcademicCalendar = (calendarData) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    localStorage.setItem('academic_calendar', JSON.stringify(calendarData));
                    window.dispatchEvent(new Event('calendarDataUpdated')); // Broadcast global event
                }
                resolve({ success: true });
            } catch (error) {
                console.error("Local save failed:", error);
                resolve({ success: false, error });
            }
        }, 100); 
    });
};
