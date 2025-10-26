import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./src/routes/authRoutes.js";
import productsRoutes from "./src/routes/productsRoutes.js";
import cartRoutes from "./src/routes/cartRoutes.js";
import { pool } from "./src/config/dbConnection.js";

dotenv.config();
const servidor = express();
const Puerto = process.env.Puerto || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verificar conexión a BD
async function verificarConexionBD() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado a PostgreSQL');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
}

// Middlewares
servidor.use(express.json());
servidor.use(cors());

// Servir archivos estáticos CORREGIDO
servidor.use(express.static(path.join(__dirname, 'public')));
servidor.use("/img", express.static(path.join(__dirname, "public", "img")));

// Ruta para verificar que las imágenes se sirven
servidor.get("/test-images", (req, res) => {
  res.json({
    message: "Test de imágenes",
    images: [
      "/img/zapato1.jpg",
      "/img/zapato2.jpg", 
      "/img/fallback.jpg"
    ]
  });
});

// Verificar conexión al iniciar
verificarConexionBD();

// Rutas
servidor.use("/auth", authRoutes);
servidor.use("/productos", productsRoutes);
servidor.use("/carrito", cartRoutes);

// Ruta de salud
servidor.get("/health", async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: "OK", 
      database: "Connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: "Error", 
      database: "Disconnected",
      error: error.message 
    });
  }
});

// Ruta raíz
servidor.get("/", (req, res) => {
  res.json({ 
    message: "API de Tienda funcionando",
    version: "1.0.0"
  });
});

// 404
servidor.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Iniciar servidor
servidor.listen(Puerto, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${Puerto}`);
  console.log(`📁 Serviendo archivos desde: ${path.join(__dirname, 'public')}`);
});