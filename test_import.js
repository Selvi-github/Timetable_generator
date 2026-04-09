
console.log("Starting import test...");
try {
    const generator = await import('./src/utils/timetableGenerator.js');
    console.log("Import success:", generator);
} catch (e) {
    console.error("Import failed:", e);
}
