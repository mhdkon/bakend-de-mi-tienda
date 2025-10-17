import express from "express";
import { usarDB } from "../config/dbConnection.js";
import { auth } from "../middlewares/authMiddleware.js";
import { inicializarProductos } from "../utils/initProducts.js";

const router = express.Router();

router.get("/", auth, (req, res) => {
  //console.log(" Petición de productos");

  usarDB(async ({ productosCol }) => {
    await inicializarProductos(productosCol);
    const productos = await productosCol.find({}).toArray();
    res.json(productos);
  });
});

// Buscar productos por nombre
router.get("/buscar", auth, (req, res) => {
  const { nombre } = req.query;

  if (!nombre) {
    return res.status(400).json({ error: "Debe proporcionar un nombre para buscar" });
  }

  usarDB(async ({ productosCol }) => {
    const regex = new RegExp(nombre, "i"); // "i" → búsqueda sin distinguir mayúsculas/minúsculas
    const resultados = await productosCol.find({ nombre: regex }).toArray();
    res.json(resultados);
  });
});

export default router;
