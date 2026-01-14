
Put **exactly this** inside:

```js
import fs from "fs";
import path from "path";

const COUNTER_PATH = path.join(process.cwd(), "data", "order-counter.json");

export function getNextOrderNumber() {
  const data = JSON.parse(fs.readFileSync(COUNTER_PATH, "utf8"));
  const nextNumber = data.lastOrderNumber + 1;

  fs.writeFileSync(
    COUNTER_PATH,
    JSON.stringify({ lastOrderNumber: nextNumber }, null, 2)
  );

  return nextNumber;
}
