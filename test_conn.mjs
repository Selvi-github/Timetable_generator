import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("MONGODB_URI not found");
    process.exit(1);
}

console.log("Connecting to:", MONGO_URI.replace(/:([^:@]+)@/, ':****@'));

try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connection Successful!");
    process.exit(0);
} catch (err) {
    console.error("❌ Connection Failed!");
    console.error(err);
    process.exit(1);
}
