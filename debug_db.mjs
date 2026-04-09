import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const MONGO_URI = process.env.MONGODB_URI;

console.log("Testing Connection to:", MONGO_URI ? "URI Found" : "URI Missing");

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

async function test2() {
    console.log("\n--- Test 2: TLS Allow Invalid ---");
    try {
        await mongoose.connect(MONGO_URI, { tlsAllowInvalidCertificates: true });
        console.log("✅ Custom Test 2 Success");
        await mongoose.disconnect();
    } catch (e) {
        console.log("❌ Custom Test 2 Failed:", e.message);
    }
}

async function run() {
    await test1();
    await test2();
    process.exit(0);
}

run();
