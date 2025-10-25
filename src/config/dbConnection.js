// ======== IMPORTACIONES ========
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

// ======== CONEXIÓN A POSTGRESQL ========
export const pool = new Pool({
  user: process.env.DB_USER || 'postgres1',
  host: process.env.DB_HOST || 'dpg-cm9upj6d3nmc73ep9iug-a.oregon-postgres.render.com',
  database: process.env.DB_NAME || 'tienda_db_b71t',
  password: process.env.DB_PASS || 'aLJFQLP0rQAz2khw9p6mejVcy138a6J5',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false  // ✅ ESTA ES LA CONFIGURACIÓN CORRECTA
  }
});

// ======== VERIFICAR CONEXIÓN ========
export const verificarConexion = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conexión a PostgreSQL exitosa");
    
    // Probar consulta simple
    const result = await client.query('SELECT NOW()');
    console.log('✅ Hora de la base de datos:', result.rows[0].now);
    
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Error conectando a PostgreSQL:", error.message);
    return false;
  }
};

// Verificar conexión al importar
verificarConexion();

export default {
  pool,
  verificarConexion
};