import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./src/routes/authRoutes.js";
import productsRoutes from "./src/routes/productsRoutes.js";
import cartRoutes from "./src/routes/cartRoutes.js";

dotenv.config();
const servidor = express();
const Puerto = process.env.Puerto || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

servidor.use(express.json());
servidor.use(cors());
servidor.use("/img", express.static(path.join(__dirname, "public/img")));

// Rutas
servidor.use("/auth", authRoutes);
servidor.use("/productos", productsRoutes);
servidor.use("/carrito", cartRoutes);

// 404
servidor.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Iniciar servidor
servidor.listen(Puerto, () => console.log(` Servidor corriendo en http://localhost:${Puerto}`));
