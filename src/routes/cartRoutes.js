import express from "express";
import { auth } from "../middlewares/authMiddleware.js";
import { pool } from "../config/dbConnection.js";  // ✅ Cambiado a pool

const router = express.Router();

// Añadir producto al carrito
router.post("/:id", auth, async (peticion, respuesta) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');  // ✅ Iniciar transacción

    const productoId = peticion.params.id;
    const userId = peticion.user.id;  // ✅ Cambiado de _id a id

    // ✅ Verificar que el producto existe y tiene stock
    const producto = await client.query(
      'SELECT id, nombre, precio, stock, imagen FROM productos WHERE id = $1 AND es_activo = true',
      [productoId]
    );

    if (producto.rows.length === 0) {
      await client.query('ROLLBACK');
      return respuesta.status(404).json({ error: "Producto no encontrado" });
    }

    const productoData = producto.rows[0];

    // ✅ Verificar stock disponible
    if (productoData.stock < 1) {
      await client.query('ROLLBACK');
      return respuesta.status(400).json({ error: "Producto sin stock disponible" });
    }

    // ✅ Verificar si el producto ya está en el carrito
    const itemExistente = await client.query(
      'SELECT * FROM carrito WHERE cliente_id = $1 AND producto_id = $2',
      [userId, productoId]
    );

    if (itemExistente.rows.length > 0) {
      // ✅ Actualizar cantidad si ya existe
      await client.query(
        'UPDATE carrito SET cantidad = cantidad + 1 WHERE cliente_id = $1 AND producto_id = $2',
        [userId, productoId]
      );
    } else {
      // ✅ Insertar nuevo item en el carrito
      await client.query(
        `INSERT INTO carrito (cliente_id, producto_id, cantidad) 
         VALUES ($1, $2, $3)`,
        [userId, productoId, 1]
      );
    }

    await client.query('COMMIT');

    // ✅ Devolver carrito actualizado
    const carritoActualizado = await pool.query(
      `SELECT c.*, p.nombre, p.precio, p.imagen, p.stock
       FROM carrito c
       JOIN productos p ON c.producto_id = p.id
       WHERE c.cliente_id = $1`,
      [userId]
    );

    respuesta.json(carritoActualizado.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error agregando al carrito:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  } finally {
    client.release();
  }
});

// Ver carrito
router.get("/", auth, async (peticion, respuesta) => {
  try {
    const userId = peticion.user.id;  // ✅ Cambiado de _id a id

    // ✅ Obtener items del carrito con información del producto
    const items = await pool.query(
      `SELECT c.*, p.nombre, p.precio, p.imagen, p.stock
       FROM carrito c
       JOIN productos p ON c.producto_id = p.id
       WHERE c.cliente_id = $1`,
      [userId]
    );

    respuesta.json(items.rows);

  } catch (error) {
    console.error("❌ Error obteniendo carrito:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

// Eliminar producto del carrito
router.delete("/:id", auth, async (peticion, respuesta) => {
  try {
    const itemId = peticion.params.id;
    const userId = peticion.user.id;

    // ✅ Eliminar item del carrito
    const resultado = await pool.query(
      'DELETE FROM carrito WHERE id = $1 AND cliente_id = $2 RETURNING *',
      [itemId, userId]
    );

    if (resultado.rows.length === 0) {
      return respuesta.status(404).json({ error: "Producto no encontrado en el carrito" });
    }

    respuesta.json({ mensaje: "Producto eliminado del carrito" });

  } catch (error) {
    console.error("❌ Error eliminando del carrito:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  }
});

// Pagar TODO el carrito
router.put("/pagar-todo", auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const userId = req.user.id;

    // ✅ Obtener items del carrito
    const carritoItems = await client.query(
      `SELECT c.*, p.nombre, p.precio, p.stock
       FROM carrito c
       JOIN productos p ON c.producto_id = p.id
       WHERE c.cliente_id = $1`,
      [userId]
    );

    if (carritoItems.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    // ✅ Verificar stock y calcular total
    let total = 0;
    for (const item of carritoItems.rows) {
      if (item.stock < item.cantidad) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Stock insuficiente para ${item.nombre}. Stock disponible: ${item.stock}` 
        });
      }
      total += item.precio * item.cantidad;
    }

    // ✅ Crear pedido
    const pedidoResult = await client.query(
      `INSERT INTO pedidos (cliente_id, total, estado) 
       VALUES ($1, $2, 'pendiente') RETURNING id`,
      [userId, total]
    );
    const pedidoId = pedidoResult.rows[0].id;

    // ✅ Crear detalles del pedido y actualizar stock
    for (const item of carritoItems.rows) {
      await client.query(
        `INSERT INTO pedidos_productos (pedido_id, producto_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [pedidoId, item.producto_id, item.cantidad, item.precio]
      );

      await client.query(
        'UPDATE productos SET stock = stock - $1 WHERE id = $2',
        [item.cantidad, item.producto_id]
      );
    }

    // ✅ Vaciar carrito
    await client.query('DELETE FROM carrito WHERE cliente_id = $1', [userId]);

    await client.query('COMMIT');

    res.json({ mensaje: "🎉 Muchas gracias por tu compra, hasta luego 🛍️" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error procesando pago:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    client.release();
  }
});

// Actualizar cantidad
router.put("/cantidad/:id", auth, async (peticion, respuesta) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const itemId = peticion.params.id;
    const userId = peticion.user.id;
    const { cantidad } = peticion.body;

    if (cantidad < 1) {
      await client.query('ROLLBACK');
      return respuesta.status(400).json({ error: "La cantidad debe ser al menos 1" });
    }

    // ✅ Verificar stock antes de actualizar
    const item = await client.query(
      `SELECT c.*, p.stock 
       FROM carrito c
       JOIN productos p ON c.producto_id = p.id
       WHERE c.id = $1 AND c.cliente_id = $2`,
      [itemId, userId]
    );

    if (item.rows.length === 0) {
      await client.query('ROLLBACK');
      return respuesta.status(404).json({ error: "Item no encontrado" });
    }

    if (item.rows[0].stock < cantidad) {
      await client.query('ROLLBACK');
      return respuesta.status(400).json({ 
        error: `Stock insuficiente. Stock disponible: ${item.rows[0].stock}` 
      });
    }

    // ✅ Actualizar cantidad
    await client.query(
      'UPDATE carrito SET cantidad = $1 WHERE id = $2 AND cliente_id = $3',
      [cantidad, itemId, userId]
    );

    await client.query('COMMIT');

    // ✅ Devolver carrito actualizado
    const carritoActualizado = await pool.query(
      `SELECT c.*, p.nombre, p.precio, p.imagen, p.stock
       FROM carrito c
       JOIN productos p ON c.producto_id = p.id
       WHERE c.cliente_id = $1`,
      [userId]
    );

    respuesta.json(carritoActualizado.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error actualizando cantidad:", error);
    respuesta.status(500).json({ error: "Error interno del servidor" });
  } finally {
    client.release();
  }
});

export default router;