import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testConnection() {
    console.log('🔍 Testing MongoDB Atlas Connection...\n');

    try {
        // Test 1: Server Status
        console.log('1. Checking server status...');
        const statusRes = await fetch(`${API_BASE}/status`);
        const status = await statusRes.json();
        console.log('   ✅ Server Status:', status);
        console.log('   ✅ Database:', status.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED');
        console.log('');

        // Test 2: Subjects Data
        console.log('2. Checking subjects data...');
        const subjectsRes = await fetch(`${API_BASE}/subjects`);
        const subjects = await subjectsRes.json();
        if (subjects && Object.keys(subjects).length > 0) {
            console.log('   ✅ Subjects loaded from MongoDB');
            console.log('   📊 Years:', Object.keys(subjects).join(', '));
        } else {
            console.log('   ⚠️  No subjects found in MongoDB (will use static data)');
        }
        console.log('');

        // Test 3: Staff Data
        console.log('3. Checking staff data...');
        const staffRes = await fetch(`${API_BASE}/staff`);
        const staff = await staffRes.json();
        if (staff && staff.length > 0) {
            console.log('   ✅ Staff loaded from MongoDB');
            console.log('   👥 Staff count:', staff.length);
        } else {
            console.log('   ⚠️  No staff found in MongoDB (will use static data)');
        }
        console.log('');

        // Test 4: Timetables
        console.log('4. Checking timetables...');
        const timetablesRes = await fetch(`${API_BASE}/timetables`);
        const timetables = await timetablesRes.json();
        if (timetables && timetables.length > 0) {
            console.log('   ✅ Timetables found in MongoDB');
            console.log('   📅 Saved timetables:', timetables.length);
        } else {
            console.log('   ℹ️  No timetables saved yet');
        }
        console.log('');

        console.log('✅ All tests completed!\n');
        console.log('Summary:');
        console.log('- Backend server: RUNNING');
        console.log('- MongoDB Atlas: ' + (status.database === 'connected' ? 'CONNECTED ✅' : 'DISCONNECTED ❌'));
        console.log('- Data persistence: ' + (subjects || staff ? 'WORKING ✅' : 'NEEDS SEEDING ⚠️'));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n⚠️  Make sure the backend server is running:');
        console.log('   npm run dev:server');
    }
}

testConnection();
