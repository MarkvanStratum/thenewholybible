import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const COUNTER_KEY = "order-counter.txt";

async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export async function getNextOrderNumber() {
  let current = 1311; // fallback if file does not exist

  try {
    const data = await r2.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: COUNTER_KEY,
      })
    );

    const text = await streamToString(data.Body);
    current = parseInt(text.trim(), 10);
  } catch (err) {
    console.log("Order counter not found, creating new one");
  }

  const next = current + 1;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: COUNTER_KEY,
      Body: String(next),
      ContentType: "text/plain",
    })
  );

  return next;
}
