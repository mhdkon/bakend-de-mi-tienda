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
        talla: "38" // Talla por defecto al añadir
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

// Editar TALLA - CÓDIGO CORREGIDO
router.put("/editar/:id", auth, (peticion, respuesta) => {
  console.log("🔍 Recibiendo petición para editar talla:");
  console.log("ID recibido:", peticion.params.id);
  console.log("User ID:", peticion.user._id);
  console.log("Talla recibida:", peticion.body.talla);

  usarDB(async ({ carritoCol }) => {
    const { talla } = peticion.body;
    
    if (!talla) {
      return respuesta.status(400).json({ error: "La talla es requerida" });
    }

    try {
      // Verificar si el ID es válido
      let objectId;
      try {
        objectId = new ObjectId(peticion.params.id);
      } catch (error) {
        return respuesta.status(400).json({ error: "ID inválido" });
      }

      // Buscar el item en el carrito
      const item = await carritoCol.findOne({ 
        _id: objectId, 
        userId: peticion.user._id 
      });

      console.log("📦 Item encontrado:", item);

      if (!item) {
        return respuesta.status(404).json({ 
          error: "Producto no encontrado en el carrito",
          idBuscado: peticion.params.id
        });
      }

      const resultado = await carritoCol.updateOne(
        { _id: objectId, userId: peticion.user._id },
        { $set: { talla } }
      );

      console.log("✅ Resultado de la actualización:", resultado);

      if (resultado.matchedCount === 0) {
        return respuesta.status(404).json({ error: "No se pudo actualizar la talla" });
      }
      
      respuesta.json({ mensaje: "Talla actualizada correctamente" });
    } catch (error) {
      console.error("❌ Error en editar talla:", error);
      respuesta.status(500).json({ error: "Error interno del servidor" });
    }
  });
});

// Backend - pagar todo y borrar carrito
router.put("/pagar-todo", auth, (req, res) => {
  usarDB(async ({ carritoCol }) => {
    await carritoCol.deleteMany({ userId: req.user._id, pagado: false });
    res.json({ mensaje: "🎉 Muchas gracias por tu compra, hasta luego 🛍️" });
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