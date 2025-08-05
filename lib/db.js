import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
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
