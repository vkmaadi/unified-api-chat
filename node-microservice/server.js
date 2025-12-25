import cors from "cors";
import express from "express";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || "Node Microservice";

app.get("/hello", (req, res) => {
  res.json({ message: `Hello from ${SERVICE_NAME}!` });
});

app.get("/time", (req, res) => {
  res.json({ time: new Date().toISOString() });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connection successful",
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// --- SSE Live Updates ---
let clients = [];

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-transform");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type"); 
  res.setHeader("Access-Control-Allow-Methods", "GET");


  clients.push(res);

  req.on("close", () => {
    clients = clients.filter(c => c !== res);
  });
});

function broadcastMessage(message) {
  clients.forEach(res => {
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  });
}

app.post("/messages", async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO messages (content) VALUES ($1) RETURNING *",
      [content]
    );

    const newMessage = result.rows[0];

    // 🔥 Broadcast to all connected SSE clients
    broadcastMessage(newMessage);

    // Respond to the sender
    res.status(201).json(newMessage);

  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "Failed to create message" });
  }
});


app.get("/messages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM messages ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});





app.listen(PORT, "0.0.0.0", () => {
  console.log(`${SERVICE_NAME} running on port ${PORT}`);
});
