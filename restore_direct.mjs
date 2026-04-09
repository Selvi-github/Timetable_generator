import mongoose from 'mongoose';
import { subjectData as staticData } from './src/data/subjectData.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const MONGO_URI = process.env.MONGODB_URI;

const SubjectSchema = new mongoose.Schema({
    data: Object,
    lastUpdated: { type: Date, default: Date.now }
});
const Subject = mongoose.model('Subject', SubjectSchema);

async function restore() {
    if (!MONGO_URI) {
        console.error("MONGODB_URI not found");
        return;
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const subjectDoc = await Subject.findOne().sort({ lastUpdated: -1 });
        if (!subjectDoc) {
            console.log("No subject document found in DB.");
            mongoose.disconnect();
            return;
        }

        const data = subjectDoc.data;
        const year = "III CSE";
        const sem = "Semester 6";
        const targetCode = "VCS342";

        if (!data[year] || !data[year][sem] || !data[year][sem].honors) {
            console.error("Target path not found in DB data");
            mongoose.disconnect();
            return;
        }

        const existing = data[year][sem].honors.find(s => s.code === targetCode);
        if (existing) {
            console.log("Subject already exists in DB.");
            mongoose.disconnect();
            return;
        }

        // Get from static data
        const original = staticData[year][sem].honors.find(s => s.code === targetCode);
        if (!original) {
            console.error("Could not find original subject in static data");
            mongoose.disconnect();
            return;
        }

        data[year][sem].honors.push(original);
        console.log("Adding back:", original.name);

        const newDoc = new Subject({ data: data });
        await newDoc.save();

        console.log("Success! Subject restored in MongoDB.");
        mongoose.disconnect();
    } catch (e) {
        console.error(e);
        mongoose.disconnect();
    }
}

restore();
