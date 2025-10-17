import express from "express";
import { ObjectId } from "mongodb";
import { usarDB } from "../config/dbConnection.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Añadir al carrito
router.post("/:id", auth, (peticion, respuesta) => {
  usarDB(async ({ productosCol, carritoCol }) => {
    const producto = await productosCol.findOne({ _id: new ObjectId(peticion.params.id) });
    if (!producto) return respuesta.status(404).json({ error: "Producto no encontrado" });

    const itemExistente = await carritoCol.findOne({
      userId: peticion.user._id,
      productoId: producto._id,
      pagado: false
    });

    if (itemExistente) {
      await carritoCol.updateOne(
        { _id: itemExistente._id },
        { $set: { cantidad: (itemExistente.cantidad || 1) + 1 } }
      );
    } else {
      await carritoCol.insertOne({
        userId: peticion.user._id,
        productoId: producto._id,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagen,
        cantidad: 1,
        pagado: false,
      });
    }

    const carritoActualizado = await carritoCol.find({ userId: peticion.user._id }).toArray();
    respuesta.json(carritoActualizado);
  });
});

// Ver carrito
router.get("/", auth, (peticion, respuesta) => {
  usarDB(async ({ carritoCol }) => {
    const items = await carritoCol.find({ userId: peticion.user._id }).toArray();
    respuesta.json(items);
  });
});

// Eliminar
router.delete("/:id", auth, (peticion, respuesta) => {
  usarDB(async ({ carritoCol }) => {
    await carritoCol.deleteOne({ _id: new ObjectId(peticion.params.id), userId: peticion.user._id });
    respuesta.json({ mensaje: "Producto eliminado del carrito" });
  });
});

// Pagar
router.put("/pagar/:id", auth, (peticion, respuesta) => {
  usarDB(async ({ carritoCol }) => {
    await carritoCol.updateOne(
      { _id: new ObjectId(peticion.params.id), userId: peticion.user._id },
      { $set: { pagado: true } }
    );
    respuesta.json({ mensaje: "Producto pagado" });
  });
});

// Editar
router.put("/editar/:id", auth, (peticion, respuesta) => {
  usarDB(async ({ productosCol, carritoCol }) => {
    const { nuevoProductoId } = peticion.body;
    const producto = await productosCol.findOne({ _id: new ObjectId(nuevoProductoId) });
    if (!producto) return respuesta.status(404).json({ error: "Producto nuevo no encontrado" });

    await carritoCol.updateOne(
      { _id: new ObjectId(peticion.params.id), userId: peticion.user._id },
      {
        $set: {
          productoId: producto._id,
          nombre: producto.nombre,
          precio: producto.precio,
          imagen: producto.imagen,
          pagado: false,
        },
      }
    );
    respuesta.json({ mensaje: "Producto del carrito actualizado" });
  });
});

// Actualizar cantidad
router.put("/cantidad/:id", auth, (peticion, respuesta) => {
  const { cantidad } = peticion.body;

  if (cantidad < 1) {
    return respuesta.status(400).json({ error: "La cantidad debe ser al menos 1" });
  }

  usarDB(async ({ carritoCol }) => {
    const resultado = await carritoCol.updateOne(
      { 
        _id: new ObjectId(peticion.params.id), 
        userId: peticion.user._id,
        pagado: false 
      },
      { $set: { cantidad } }
    );

    if (resultado.matchedCount === 0) {
      return respuesta.status(404).json({ error: "Item no encontrado" });
    }

    const carritoActualizado = await carritoCol.find({ userId: peticion.user._id }).toArray();
    respuesta.json(carritoActualizado);
  });
});

export default router;
