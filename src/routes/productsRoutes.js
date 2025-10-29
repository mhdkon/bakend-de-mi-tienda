import express from "express";
import { auth } from "../middlewares/authMiddleware.js";
import { pool } from "../../db.js";

const router = express.Router();

// Obtener todos los productos
router.get("/", auth, async (peticion, respuesta) => {
  try {
    // Consulta directa a PostgreSQL
    const productos = await pool.query(`
      SELECT p.id, p.nombre, p.precio, p.stock, c.nombre as categoria, p.marca, p.imagen
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.es_activo = true
      ORDER BY p.id
    `);

    respuesta.json(productos.rows);

  } catch (error) {
    console.error("Error obteniendo productos:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

// Buscar productos por nombre
router.get("/buscar", auth, async (peticion, respuesta) => {
  try {
    const { nombre } = peticion.query;

    if (!nombre) {
      return respuesta.status(400).json({ error: "Debe proporcionar un nombre para buscar" });
    }

 
    const resultados = await pool.query(`
      SELECT p.id, p.nombre, p.precio, p.stock, c.nombre as categoria, p.marca, p.imagen
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE (p.nombre ILIKE $1 OR p.marca ILIKE $1 OR c.nombre ILIKE $1)
      AND p.es_activo = true
      ORDER BY p.nombre
    `, [`%${nombre}%`]);

    respuesta.json(resultados.rows);

  } catch (error) {
    console.error("Error buscando productos:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener producto por ID
router.get("/:id", auth, async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;

    // Obtener producto específico
    const producto = await pool.query(`
      SELECT p.*, c.nombre as categoria
      FROM productos p 
      JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.id = $1 AND p.es_activo = true
    `, [id]);

    if (producto.rows.length === 0) {
      return respuesta.status(404).json({ error: "Producto no encontrado" });
    }

    respuesta.json(producto.rows[0]);

  } catch (error) {
    console.error("Error obteniendo producto:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener todas las categorías
router.get("/categorias/todas", auth, async (peticion, respuesta) => {
  try {
    // Obtener categorías
    const categorias = await pool.query(`
      SELECT id, nombre, descripcion, fecha_creacion
      FROM categorias
      ORDER BY nombre
    `);

    respuesta.json(categorias.rows);

  } catch (error) {
    console.error("Error obteniendo categorías:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener productos por categoría
router.get("/categoria/:id", auth, async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;

    const productos = await pool.query(`
      SELECT p.id, p.nombre, p.precio, p.stock, c.nombre as categoria, p.marca, p.imagen
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.categoria_id = $1 AND p.es_activo = true
      ORDER BY p.nombre
    `, [id]);

    respuesta.json(productos.rows);

  } catch (error) {
    console.error("Error obteniendo productos por categoría:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

// Productos destacados
router.get("/destacados/todos", auth, async (peticion, respuesta) => {
  try {
    
    const productos = await pool.query(`
      SELECT p.id, p.nombre, p.precio, p.stock, c.nombre as categoria, p.marca, p.imagen
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.es_activo = true
      ORDER BY p.precio DESC
      LIMIT 8
    `);

    respuesta.json(productos.rows);

  } catch (error) {
    console.error("Error obteniendo productos destacados:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;