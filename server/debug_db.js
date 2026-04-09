const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;
console.log("Testing URI:", MONGO_URI ? "Found" : "Missing");

async function test() {
    console.log("Attempt 1: Standard + tlsAllowInvalidCertificates");
    try {
        await mongoose.connect(MONGO_URI, { tlsAllowInvalidCertificates: true });
        console.log("✅ Success!");
        process.exit(0);
    } catch (e) {
        console.log("❌ Failed:", e.message);
    }

    console.log("Attempt 2: No Options");
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Success!");
        process.exit(0);
    } catch (e) {
        console.log("❌ Failed:", e.message);
    }

    console.log("Attempt 3: TLS: true + Insecure");
    try {
        await mongoose.connect(MONGO_URI, { tls: true, tlsAllowInvalidCertificates: true });
        console.log("✅ Success!");
        process.exit(0);
    } catch (e) {
        console.log("❌ Failed:", e.message);
    }
}

test();
