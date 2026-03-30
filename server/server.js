import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 5000);

const dbPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "data_base",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.get("/api/properties", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 200);
    const city = (req.query.city || "").toString().trim().toLowerCase();

    const sql = `
      SELECT
        id,
        title,
        price_raw,
        price_value,
        location_raw,
        city,
        country,
        image,
        description,
        source,
        url,
        scraped_at
      FROM clean_listings
      WHERE (? = '' OR city = ?)
      ORDER BY COALESCE(scraped_at, NOW()) DESC, id DESC
      LIMIT ?
    `;

    const [rows] = await dbPool.execute(sql, [city, city, limit]);
    res.json({ count: rows.length, data: rows });
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    res.status(500).json({ message: "Failed to fetch properties" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🔥`);
});