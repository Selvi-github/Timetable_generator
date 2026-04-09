import fetch from 'node-fetch';
import { subjectData } from './src/data/subjectData.js';
import { staffMembers } from './src/data/staffMembers.js';

const API_BASE = 'http://localhost:5000/api';

async function seedDatabase() {
    console.log('🌱 Seeding MongoDB Atlas with initial data...\n');

    try {
        // Check server status first
        console.log('1. Checking server connection...');
        const statusRes = await fetch(`${API_BASE}/status`);
        const status = await statusRes.json();

        if (status.database !== 'connected') {
            throw new Error('MongoDB is not connected!');
        }
        console.log('   ✅ MongoDB is connected\n');

        // Seed Subjects
        console.log('2. Seeding subjects data...');
        const subjectsRes = await fetch(`${API_BASE}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subjectData)
        });

        if (!subjectsRes.ok) {
            throw new Error(`Subjects seed failed: ${subjectsRes.statusText}`);
        }

        const subjectsResult = await subjectsRes.json();
        console.log('   ✅ Subjects seeded:', subjectsResult.message);
        console.log('   📊 Years:', Object.keys(subjectData).join(', '));
        console.log('');

        // Seed Staff
        console.log('3. Seeding staff data...');
        const staffRes = await fetch(`${API_BASE}/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(staffMembers)
        });

        if (!staffRes.ok) {
            throw new Error(`Staff seed failed: ${staffRes.statusText}`);
        }

        const staffResult = await staffRes.json();
        console.log('   ✅ Staff seeded:', staffResult.message);
        console.log('   👥 Staff count:', staffMembers.length);
        console.log('');

        // Verify seeded data
        console.log('4. Verifying seeded data...');
        const verifySubjects = await fetch(`${API_BASE}/subjects`);
        const verifyStaff = await fetch(`${API_BASE}/staff`);

        const loadedSubjects = await verifySubjects.json();
        const loadedStaff = await verifyStaff.json();

        console.log('   ✅ Subjects verified:', Object.keys(loadedSubjects).length, 'years');
        console.log('   ✅ Staff verified:', loadedStaff.length, 'members');
        console.log('');

        console.log('✅ Database seeding completed successfully!\n');
        console.log('📝 Summary:');
        console.log('   - Subjects: SEEDED ✅');
        console.log('   - Staff: SEEDED ✅');
        console.log('   - MongoDB Atlas: READY FOR USE ✅');
        console.log('\n🎉 Your timetable system is now using live MongoDB data!');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        console.log('\n⚠️  Troubleshooting:');
        console.log('   1. Make sure backend server is running: npm run dev:server');
        console.log('   2. Check MongoDB connection in server/.env');
        console.log('   3. Verify network connection to MongoDB Atlas');
        process.exit(1);
    }
}

seedDatabase();
