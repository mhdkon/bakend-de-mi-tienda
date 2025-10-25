import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "../config/dbConnection.js";

dotenv.config();
const router = express.Router();
const SECRET = process.env.SECRET || "mi_secreto_super_seguro";

// Middleware para logging
router.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body);
  next();
});

// Registro
router.post("/register", async (peticion, respuesta) => {
  let client;
  try {
    let { nombre, password, email, telefono, direccion } = peticion.body;

    console.log('🔄 Intentando registrar usuario:', { nombre, email });

    // Validaciones básicas
    if (!nombre || !password || !email) {
      return respuesta.status(400).json({ 
        error: "Nombre, email y contraseña son obligatorios" 
      });
    }

    nombre = nombre.trim();
    const nombreRegex = /^[A-Z][a-z]+ [A-Z][a-z]+$/;
    if (!nombreRegex.test(nombre)) {
      return respuesta.status(400).json({ 
        error: "Formato de nombre inválido (Nombre Apellido)" 
      });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
      return respuesta.status(400).json({ 
        error: "La contraseña debe tener mínimo 6 caracteres y un número" 
      });
    }

    client = await pool.connect();

    // Verificar si el usuario ya existe
    const usuarioExistente = await client.query(
      'SELECT * FROM clientes WHERE email = $1', 
      [email]
    );

    if (usuarioExistente.rows.length > 0) {
      return respuesta.status(400).json({ 
        error: "El usuario ya existe" 
      });
    }

    const hash = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario
    const nuevoUsuario = await client.query(
      `INSERT INTO clientes (nombre, email, telefono, direccion, password) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nombre, email, telefono, direccion`,
      [nombre, email, telefono, direccion, hash]
    );

    console.log('✅ Usuario registrado exitosamente:', nuevoUsuario.rows[0].email);
    
    respuesta.status(201).json({ 
      mensaje: "Usuario registrado correctamente",
      data: nuevoUsuario.rows[0]
    });

  } catch (error) {
    console.error("❌ Error en registro:", error);
    
    // Respuesta de error más detallada
    respuesta.status(500).json({ 
      error: "Error interno del servidor",
      detalle: error.message 
    });
    
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Login (también actualizado con mejor manejo de errores)
router.post("/login", async (peticion, respuesta) => {
  let client;
  try {
    const { email, password } = peticion.body;

    console.log('🔄 Intentando login:', email);

    if (!email || !password) {
      return respuesta.status(400).json({ 
        error: "Email y password son requeridos" 
      });
    }

    client = await pool.connect();

    // Buscar usuario por EMAIL
    const usuario = await client.query(
      'SELECT * FROM clientes WHERE email = $1',
      [email]
    );

    if (usuario.rows.length === 0) {
      return respuesta.status(400).json({ 
        error: "Email o contraseña incorrectos" 
      });
    }

    const usuarioData = usuario.rows[0];

    const correcto = await bcrypt.compare(password, usuarioData.password);
    if (!correcto) {
      return respuesta.status(400).json({ 
        error: "Email o contraseña incorrectos" 
      });
    }

    console.log('✅ Login exitoso:', usuarioData.email);

    const token = jwt.sign(
      { 
        id: usuarioData.id,
        nombre: usuarioData.nombre,
        email: usuarioData.email 
      }, 
      SECRET, 
      { expiresIn: "2h" }
    );

    respuesta.json({ 
      token, 
      mensaje: "Bienvenido, " + usuarioData.nombre,
      data: {
        id: usuarioData.id,
        nombre: usuarioData.nombre,
        email: usuarioData.email,
        telefono: usuarioData.telefono,
        direccion: usuarioData.direccion
      }
    });

  } catch (error) {
    console.error("❌ Error en login:", error);
    
    respuesta.status(500).json({ 
      error: "Error interno del servidor",
      detalle: error.message 
    });
    
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router;