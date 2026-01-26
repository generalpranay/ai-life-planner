
const dateStr = "2026-01-07T07:00:00.000Z"; // Assume this came from frontend (Midnight Local -> 7 AM UTC)
const startH = 7;
const startM = 0;

console.log("Server Timezone Check:");
console.log("Current Date:", new Date().toString());
console.log("Offset (min):", new Date().getTimezoneOffset());

console.log("\nSimulating Task Sync:");
console.log("Input due_datetime:", dateStr);
const dateObj = new Date(dateStr);
console.log("Date Object:", dateObj.toString());

const startDt = new Date(dateObj);
startDt.setHours(startH, startM, 0, 0);
console.log(`After setHours(${startH}):`, startDt.toString());
console.log("ISO String:", startDt.toISOString());
