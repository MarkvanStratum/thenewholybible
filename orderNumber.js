const fs = require("fs");
const path = require("path");

const COUNTER_PATH = path.join(process.cwd(), "data", "order-counter.json");

function getNextOrderNumber() {
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
