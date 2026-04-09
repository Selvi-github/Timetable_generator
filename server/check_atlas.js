const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI;

console.log("Connecting to:", MONGO_URI.replace(/:([^:@]+)@/, ':****@'));

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("✅ Connection Successful!");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Connection Failed!");
        console.error(err);
        process.exit(1);
    });
