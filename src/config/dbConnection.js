// ======== IMPORTACIONES ========
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

// ======== CONEXIÓN A POSTGRESQL ========
export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tienda_db',
  password: process.env.DB_PASS || 'admin',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ======== VERIFICAR CONEXIÓN ========
export const verificarConexion = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conexión a PostgreSQL exitosa");
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Error conectando a PostgreSQL:", error.message);
    return false;
  }
};

export default {
  pool,
  verificarConexion
};