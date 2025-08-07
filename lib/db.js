import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "157.173.220.171",
  user: "apps_db5",
  password: "q4w3noVm8Pqe",
  database: "apps_db5",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000, // 30 seconds
});

export const connectDB = async () => {
  try {
    const connection = await pool.getConnection(); // Get a connection from the pool
    console.log("Database connection acquired!");
    return connection;
  } catch (error) {
    console.error("Error connecting to the database:", error.message);
    throw error;
  }
};

const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping(); // test ping to DB
    console.log("✅ DB ping successful");
    conn.release();
  } catch (error) {
    console.error("❌ DB ping failed:", error);
  }
};

testConnection();
