const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI;

const SubjectSchema = new mongoose.Schema({
    data: Object,
    lastUpdated: { type: Date, default: Date.now }
});
const Subject = mongoose.model('Subject', SubjectSchema);

const subjectToRestore = {
    code: "VCS342",
    name: "Image Processing",
    type: "theory",
    academicRule: { totalPeriods: 30, periodsPerWeek: 2, continuous: false },
    staffConfig: { primary: ["Ms.M.Mohana", "Ms.K.Priyadharshini", "Mr.D.Raj"], substitute: [] }
};

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
            console.log("No subject document found.");
            process.exit(0);
        }

        const data = subjectDoc.data;
        const year = "III CSE";
        const sem = "Semester 6";

        if (!data[year] || !data[year][sem]) {
            console.error("Year/Semester not found in DB");
            process.exit(1);
        }

        if (!data[year][sem].honors) data[year][sem].honors = [];

        const existing = data[year][sem].honors.find(s => s.code === subjectToRestore.code);
        if (existing) {
            console.log("Subject already exists in DB.");
            process.exit(0);
        }

        data[year][sem].honors.push(subjectToRestore);
        console.log("Restoring:", subjectToRestore.name);

        const newDoc = new Subject({ data: data });
        await newDoc.save();

        console.log("Success! Subject restored.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

restore();
