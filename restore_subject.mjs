import fetch from 'node-fetch';
import { subjectData as staticData } from './src/data/subjectData.js';

const API_BASE_URL = 'http://localhost:5000/api';

async function restore() {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects`);
        if (!response.ok) throw new Error('Failed to fetch subjects');
        let currentData = await response.json();

        // If DB is empty, start with static data
        if (!currentData) {
            console.log("DB is empty, initializing with static data...");
            currentData = JSON.parse(JSON.stringify(staticData));
        }

        // Target: III CSE -> Semester 6 -> honors
        const year = "III CSE";
        const sem = "Semester 6";
        const targetCode = "VCS342";

        if (!currentData[year]) currentData[year] = {};
        if (!currentData[year][sem]) currentData[year][sem] = { subjects: [], honors: [] };
        if (!currentData[year][sem].honors) currentData[year][sem].honors = [];

        const existing = currentData[year][sem].honors.find(s => s.code === targetCode);
        if (existing) {
            console.log("Subject already exists in current data.");
            return;
        }

        // Get from static data
        const original = staticData[year][sem].honors.find(s => s.code === targetCode);
        if (!original) {
            console.error("Could not find original subject in static data");
            return;
        }

        currentData[year][sem].honors.push(original);
        console.log("Restoring:", original.name);

        const saveResponse = await fetch(`${API_BASE_URL}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentData)
        });

        if (saveResponse.ok) {
            console.log("Successfully restored Image Processing!");
        } else {
            console.error("Failed to save restored data");
        }
    } catch (e) {
        console.error(e);
    }
}

restore();
