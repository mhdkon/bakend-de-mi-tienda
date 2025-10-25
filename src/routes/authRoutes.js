import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "../config/dbConnection.js";  // ✅ Cambiado a pool

dotenv.config();
const router = express.Router();
const SECRET = process.env.SECRET || "mi_secreto_super_seguro";

// Registro
router.post("/register", async (peticion, respuesta) => {  // ✅ Agregado async
  try {
    let { nombre, password, email, telefono, direccion } = peticion.body;  // ✅ Agregados campos nuevos

    // Validaciones básicas
    if (!nombre || !password || !email)  // ✅ Email ahora obligatorio
      return respuesta.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });

    nombre = nombre.trim();
    const nombreRegex = /^[A-Z][a-z]+ [A-Z][a-z]+$/;
    if (!nombreRegex.test(nombre))
      return respuesta
        .status(400)
        .json({ error: "Formato de nombre inválido (Nombre Apellido)" });

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(password))
      return respuesta
        .status(400)
        .json({ error: "La contraseña debe tener mínimo 6 caracteres y un número" });

    // ✅ Verificar si el usuario ya existe (por EMAIL ahora)
    const usuarioExistente = await pool.query(
      'SELECT * FROM clientes WHERE email = $1', 
      [email]
    );

    const hash = await bcrypt.hash(password, 10);

    if (usuarioExistente.rows.length > 0) {
      // ✅ Actualizar contraseña si el usuario existe
      await pool.query(
        'UPDATE clientes SET password = $1 WHERE email = $2',
        [hash, email]
      );
      return respuesta.json({ mensaje: "Usuario ya existía, contraseña actualizada" });
    }

    // ✅ Insertar nuevo usuario en PostgreSQL
    const nuevoUsuario = await pool.query(
      `INSERT INTO clientes (nombre, email, telefono, direccion, password) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nombre, email, telefono, direccion`,
      [nombre, email, telefono, direccion, hash]
    );

    respuesta.json({ 
      mensaje: "Usuario registrado correctamente",
      data: nuevoUsuario.rows[0]  // ✅ Devolver datos del usuario creado
    });

  } catch (error) {
    console.error("❌ Error en registro:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

// Login
router.post("/login", async (peticion, respuesta) => {  // ✅ Agregado async
  try {
    const { email, password } = peticion.body;  // ✅ Cambiado a email

    // ✅ Buscar usuario por EMAIL en PostgreSQL
    const usuario = await pool.query(
      'SELECT * FROM clientes WHERE email = $1',
      [email]
    );

    if (usuario.rows.length === 0)
      return respuesta.status(400).json({ error: "Email o contraseña incorrectos" });

    const usuarioData = usuario.rows[0];

    const correcto = await bcrypt.compare(password, usuarioData.password);
    if (!correcto)
      return respuesta.status(400).json({ error: "Email o contraseña incorrectos" });

    // ✅ Generar token con ID numérico de PostgreSQL
    const token = jwt.sign(
      { 
        id: usuarioData.id,  // ✅ Cambiado _id por id
        nombre: usuarioData.nombre,
        email: usuarioData.email 
      }, 
      SECRET, 
      { expiresIn: "2h" }
    );

    respuesta.json({ 
      token, 
      mensaje: "Bienvenido, " + usuarioData.nombre,
      data: {  // ✅ Devolver datos del usuario (sin password)
        id: usuarioData.id,
        nombre: usuarioData.nombre,
        email: usuarioData.email,
        telefono: usuarioData.telefono,
        direccion: usuarioData.direccion
      }
    });

  } catch (error) {
    console.error("❌ Error en login:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;