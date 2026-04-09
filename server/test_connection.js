require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
console.log("Testing Connection to:", uri ? "URI Found (Hidden)" : "URI MISSING");

if (!uri) process.exit(1);

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    tlsAllowInvalidCertificates: true,
    family: 4
})
    .then(() => {
        console.log("SUCCESS: Connected to MongoDB!");
        process.exit(0);
    })
    .catch(err => {
        console.error("FAILURE: Could not connect.");
        console.error("Error Code:", err.code);
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        if (err.message.includes("SSL") || err.message.includes("handshake")) {
            console.log("\n--- TROUBLESHOOTING ---");
            console.log("1. IP Whitelist: Go to MongoDB Atlas -> Network Access -> Add IP Address -> 'Allow Access from Anywhere' (0.0.0.0/0)");
            console.log("2. Firewalls: Ensure your network allows outbound traffic on port 27017.");
        }
        process.exit(1);
    });
