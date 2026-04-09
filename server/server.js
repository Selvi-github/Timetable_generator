const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Root Health Check
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; padding: 50px; text-align: center;">
            <h1 style="color: #2563eb;">🚀 Timetable Backend is LIVE</h1>
            <p>MongoDB Status: <b>${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}</b></p>
            <hr style="width: 50px; margin: 20px auto;">
            <p style="color: #64748b;">API is ready for requests at /api/...</p>
        </div>
    `);
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("❌ ERROR: MONGODB_URI not found in server/.env file!");
    // Don't exit, just warn, so server can still serve health check
} else {
    const connectDB = async () => {
        try {
            await mongoose.connect(MONGO_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                // tls: true, // Implied by mongodb+srv
                // Common fix for "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR" on restricted networks/Windows
                tlsAllowInvalidCertificates: true,
                tlsAllowInvalidHostnames: true,
                family: 4 // Force IPv4 to avoid dual-stack issues
            });
            console.log('✅ MongoDB Connected Successfully');
        } catch (err) {
            console.error('❌ MongoDB Connection Failed:', err.message);
            // Retry logic could go here, but usually mongoose buffers
        }
    };
    connectDB();

    mongoose.connection.on('error', err => {
        console.error('❌ MongoDB Runtime Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB Disconnected');
    });
}

// --- Schemas ---

const StaffSchema = new mongoose.Schema({
    members: Array,
    lastUpdated: { type: Date, default: Date.now }
});

const SubjectSchema = new mongoose.Schema({
    data: Object, // Stores the entire subject hierarchy for now (simplest migration)
    lastUpdated: { type: Date, default: Date.now }
});

const TimetableSchema = new mongoose.Schema({
    config: Object,
    timetable: Object,
    year: String,    // Top-level for easy searching
    section: String, // Top-level for easy searching
    timestamp: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: false }
});

const CalendarSchema = new mongoose.Schema({
    data: Object,
    lastUpdated: { type: Date, default: Date.now }
});

const Staff = mongoose.model('Staff', StaffSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const Timetable = mongoose.model('Timetable', TimetableSchema);
const Calendar = mongoose.model('Calendar', CalendarSchema);

// --- Staff API ---
app.get('/api/staff', async (req, res) => {
    try {
        const staffDoc = await Staff.findOne().sort({ lastUpdated: -1 });
        res.json(staffDoc ? staffDoc.members : []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/staff', async (req, res) => {
    try {
        const doc = new Staff({ members: req.body });
        await doc.save();
        res.json({ message: 'Staff saved', success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Subject API ---
app.get('/api/subjects', async (req, res) => {
    try {
        const doc = await Subject.findOne().sort({ lastUpdated: -1 });
        res.json(doc ? doc.data : {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/subjects', async (req, res) => {
    try {
        const doc = new Subject({ data: req.body });
        await doc.save();
        res.json({ message: 'Subjects saved', success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Timetable API ---
app.post('/api/timetable', async (req, res) => {
    try {
        const { config, timetable, _id, isPublished } = req.body;

        let doc;
        if (_id && mongoose.Types.ObjectId.isValid(_id)) {
            // Update existing or Upsert if provided ID appears valid
            doc = await Timetable.findByIdAndUpdate(
                _id,
                {
                    config,
                    timetable,
                    year: config.year,
                    section: config.section,
                    timestamp: Date.now(),
                    isPublished: !!isPublished
                },
                { new: true, upsert: true } // Return updated, create if not exists
            );
        } else {
            // Create New
            doc = new Timetable({
                config,
                timetable,
                year: config.year,
                section: config.section,
                isPublished: !!isPublished
            });
            await doc.save();
        }

        // Return the actual ID so frontend can track it
        res.json({ message: 'Timetable saved', success: true, _id: doc._id });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// BATCH ATOMIC SAVE (Transactional)
// Either all save or nothing saves.
app.post('/api/timetable/batch', async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { items } = req.body; // Array of { config, timetable, _id, isPublished }
        if (!Array.isArray(items)) throw new Error("Invalid batch data: 'items' must be an array");

        let savedResults = [];

        await session.withTransaction(async () => {
            for (const item of items) {
                const { config, timetable, _id, isPublished } = item;
                let doc;

                if (_id && mongoose.Types.ObjectId.isValid(_id)) {
                    doc = await Timetable.findByIdAndUpdate(
                        _id,
                        {
                            config,
                            timetable,
                            year: config.year,
                            section: config.section,
                            timestamp: Date.now(),
                            isPublished: !!isPublished
                        },
                        { new: true, session }
                    );
                } else {
                    doc = new Timetable({
                        config,
                        timetable,
                        year: config.year,
                        section: config.section,
                        isPublished: !!isPublished
                    });
                    await doc.save({ session });
                }
                savedResults.push({ _id: doc._id, section: config.section });
            }
        });

        res.json({
            message: `Successfully saved ${items.length} timetables atomically`,
            success: true,
            results: savedResults
        });

    } catch (err) {
        console.error("Batch Transaction Failed:", err);
        res.status(500).json({
            error: "Batch Save Failed: Nothing was written to database.",
            details: err.message
        });
    } finally {
        session.endSession();
    }
});

// 3. Timetable Sync
app.get('/api/timetable/latest', async (req, res) => {
    try {
        const query = {};
        if (req.query.published === 'true') {
            query.isPublished = true;
        }
        const latest = await Timetable.findOne(query).sort({ timestamp: -1 });
        res.json(latest || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/timetables_full', async (req, res) => {
    try {
        const query = {};
        if (req.query.published === 'true') {
            query.isPublished = true;
        }
        const list = await Timetable.find(query).lean();
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/timetables', async (req, res) => {
    try {
        const query = {};
        if (req.query.published === 'true') {
            query.isPublished = true;
        }
        // Return list of saved timetables (exclude large data for list view)
        const list = await Timetable.find(query, 'config timestamp isPublished').sort({ timestamp: -1 });
        console.log(`[API] Fetched ${list.length} saved timetables from DB`);
        res.json(list);
    } catch (err) {
        console.error("[API] History Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Calendar Routes
app.get('/api/calendar', async (req, res) => {
    try {
        const calDoc = await Calendar.findOne().sort({ lastUpdated: -1 });
        res.json(calDoc ? calDoc.data : {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/calendar', async (req, res) => {
    try {
        const newDoc = new Calendar({ data: req.body });
        await newDoc.save();
        res.json({ message: 'Calendar saved', success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
