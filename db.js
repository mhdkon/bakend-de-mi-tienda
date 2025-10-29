
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

export const pool = new Pool({
  user: process.env.DB_USER || 'postgres1',
  host: process.env.DB_HOST || 'dpg-d3ub0e0gjchc73a73c0g-a',
  database: process.env.DB_NAME || 'tienda_db_b71t',
  password: process.env.DB_PASS || 'aLJFQLP0rQAz2khw9p6mejVcy138a6J5',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false  
  }
});


export const verificarConexion = async () => {
  try {
    const client = await pool.connect();
    console.log(" Conexión a PostgreSQL exitosa");
    client.release();
    return true;
  } catch (error) {
    console.error(" Error conectando a PostgreSQL:", error.message);
    return false;
  }
};

export default {
  pool,
  verificarConexion
};