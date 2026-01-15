const fs = require("fs");
const path = require("path");

const COUNTER_PATH = path.join(process.cwd(), "data", "order-counter.json");

function getNextOrderNumber() {
  // Ensure /data folder exists
  const dataDir = path.dirname(COUNTER_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // If file does not exist, create it starting at 1116
  if (!fs.existsSync(COUNTER_PATH)) {
    fs.writeFileSync(
      COUNTER_PATH,
      JSON.stringify({ lastOrderNumber: 1116 }, null, 2)
    );
  }

  const data = JSON.parse(fs.readFileSync(COUNTER_PATH, "utf8"));
  const nextNumber = data.lastOrderNumber + 1;

  fs.writeFileSync(
    COUNTER_PATH,
    JSON.stringify({ lastOrderNumber: nextNumber }, null, 2)
  );

  return nextNumber;
}

module.exports = {
  getNextOrderNumber
};
