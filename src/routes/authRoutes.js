import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { usarDB } from "../config/dbConnection.js";

dotenv.config();
const router = express.Router();
const SECRET = process.env.SECRET || "mi_secreto_super_seguro";

// Registro
router.post("/register", (peticion, respuesta) => {

  usarDB(async ({ usuariosCol }) => {
    let { nombre, password } = peticion.body;

    if (!nombre || !password)
      return respuesta.status(400).json({ error: "Faltan datos" });

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

    const usuarioExistente = await usuariosCol.findOne({ nombre });
    const hash = await bcrypt.hash(password, 10);

    if (usuarioExistente) {
      await usuariosCol.updateOne({ nombre }, { $set: { password: hash } });
      return respuesta.json({ mensaje: "Usuario ya existía, contraseña actualizada" });
    }

    await usuariosCol.insertOne({ nombre, password: hash });
    respuesta.json({ mensaje: "Usuario registrado correctamente" });
  });
});

// Login
router.post("/login", (peticion, respuesta) => {

  usarDB(async ({ usuariosCol }) => {
    const { nombre, password } = peticion.body;
    const usuario = await usuariosCol.findOne({ nombre });

    if (!usuario)
      return respuesta.status(400).json({ error: "Nombre o contraseña incorrectos" });

    const correcto = await bcrypt.compare(password, usuario.password);
    if (!correcto)
      return respuesta.status(400).json({ error: "Nombre o contraseña incorrectos" });

    const token = jwt.sign({ _id: usuario._id, nombre: usuario.nombre }, SECRET, {
      expiresIn: "2h",
    });
    respuesta.json({ token, mensaje: "Bienvenido, " + usuario.nombre });
  });
});

export default router;
