const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const MONGO_URI = process.env.MONGODB_URI;

console.log("Testing Connection to:", MONGO_URI ? "URI Found" : "URI Missing");

// Test 1: No Options
async function test1() {
    console.log("\n--- Test 1: Default ---");
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Custom Test 1 Success");
        await mongoose.disconnect();
    } catch (e) {
        console.log("❌ Custom Test 1 Failed:", e.message);
    }
}

// Test 2: TLS Insecure
async function test2() {
    console.log("\n--- Test 2: TLS Insecure ---");
    try {
        await mongoose.connect(MONGO_URI, { tls: true, tlsAllowInvalidCertificates: true });
        console.log("✅ Custom Test 2 Success");
        await mongoose.disconnect();
    } catch (e) {
        console.log("❌ Custom Test 2 Failed:", e.message);
    }
}

// Test 3: Legacy Options
async function test3() {
    console.log("\n--- Test 3: Legacy/Timeout ---");
    try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 });
        console.log("✅ Custom Test 3 Success");
        await mongoose.disconnect();
    } catch (e) {
        console.log("❌ Custom Test 3 Failed:", e.message);
    }
}

async function run() {
    await test1();
    await test2();
    await test3();
    process.exit(0);
}

run();
