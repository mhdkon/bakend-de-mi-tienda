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

// Variable para controlar que las tablas solo se creen una vez
let tablasCreadas = false;

// Función para crear tablas automáticamente
async function createTables() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔄 Conectado a la base de datos, creando tablas...');

    // Crear tabla clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        telefono VARCHAR(20),
        direccion TEXT,
        password VARCHAR(255) NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        es_activo BOOLEAN DEFAULT TRUE
      )
    `);
    console.log('✅ Tabla clientes creada/verificada');

    // Crear tabla categorias
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        descripcion TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla categorias creada/verificada');

    // Crear tabla productos
    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        precio NUMERIC(10,2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        categoria_id INT REFERENCES categorias(id),
        imagen VARCHAR(255),
        marca VARCHAR(100),
        es_activo BOOLEAN DEFAULT TRUE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla productos creada/verificada');

    // Crear tabla pedidos
    await client.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INT REFERENCES clientes(id),
        fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(50) DEFAULT 'pendiente',
        total NUMERIC(10,2) DEFAULT 0,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla pedidos creada/verificada');

    // Crear tabla pedidos_productos
    await client.query(`
      CREATE TABLE IF NOT EXISTS pedidos_productos (
        id SERIAL PRIMARY KEY,
        pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
        producto_id INT REFERENCES productos(id),
        cantidad INT NOT NULL,
        precio_unitario NUMERIC(10,2) NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla pedidos_productos creada/verificada');

    // Crear tabla carrito - ACTUALIZADA CON TALLA
    await client.query(`
      CREATE TABLE IF NOT EXISTS carrito (
        id SERIAL PRIMARY KEY,
        cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
        producto_id INT REFERENCES productos(id),
        cantidad INT NOT NULL DEFAULT 1,
        talla VARCHAR(10) DEFAULT '38',
        fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla carrito creada/verificada CON TALLA');

    // Añadir constraint única para cliente_id + producto_id + talla si no existe
    try {
      await client.query(`
        ALTER TABLE carrito 
        ADD CONSTRAINT carrito_cliente_producto_talla_unique 
        UNIQUE (cliente_id, producto_id, talla)
      `);
      console.log('✅ Constraint única añadida a carrito');
    } catch (error) {
      console.log('ℹ️  Constraint ya existe o no se pudo añadir');
    }

    // Insertar categorías básicas
    await client.query(`
      INSERT INTO categorias (id, nombre, descripcion) VALUES
      (1, 'Zapatos Deportivos', 'Zapatos para deporte'),
      (2, 'Zapatos Formales', 'Zapatos elegantes'),
      (3, 'Sandalias', 'Calzado abierto'),
      (4, 'Botas', 'Calzado de protección')
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion
    `);
    console.log('✅ Categorías insertadas/actualizadas');

    // Insertar productos de ejemplo
    await client.query(`
      INSERT INTO productos (id, nombre, precio, stock, categoria_id, imagen, marca) VALUES
      (1, 'AirFlex Runner', 30.00, 41, 1, '/img/zapato5.jpg', 'Running'),
      (2, 'Urban Step', 5.00, 28, 1, '/img/zapato6.jpg', 'Casual'),
      (3, 'Street Move', 25.00, 32, 1, '/img/zapato2.jpg', 'Urbana'),
      (4, 'Classic Formal', 45.00, 15, 2, '/img/zapato3.jpg', 'Elegance'),
      (5, 'Summer Sandals', 20.00, 25, 3, '/img/zapato4.jpg', 'Beach'),
      (6, 'Winter Boots', 60.00, 12, 4, '/img/zapato1.jpg', 'Mountain')
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        precio = EXCLUDED.precio,
        stock = EXCLUDED.stock,
        categoria_id = EXCLUDED.categoria_id,
        imagen = EXCLUDED.imagen,
        marca = EXCLUDED.marca
    `);
    console.log('✅ Productos insertados/actualizados');

    console.log('✅ Todas las tablas creadas exitosamente');
    tablasCreadas = true;
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

servidor.use(express.json());
servidor.use(cors());
servidor.use("/img", express.static(path.join(__dirname, "public/img")));

// Middleware para inicializar tablas si es necesario
servidor.use(async (req, res, next) => {
  if (!tablasCreadas) {
    await createTables();
  }
  next();
});

// Rutas
servidor.use("/auth", authRoutes);
servidor.use("/productos", productsRoutes);
servidor.use("/carrito", cartRoutes);

// Ruta de verificación de estado
servidor.get("/status", (req, res) => {
  res.json({ 
    status: "Servidor funcionando", 
    database: "Tablas creadas",
    timestamp: new Date().toISOString()
  });
});

// Ruta para forzar recreación de tablas (solo desarrollo)
servidor.post("/reset-db", async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "No permitido en producción" });
  }
  tablasCreadas = false;
  await createTables();
  res.json({ message: "Base de datos reiniciada" });
});

// 404
servidor.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Iniciar servidor
servidor.listen(Puerto, () => {
  console.log(` Servidor corriendo en http://localhost:${Puerto}`);
  console.log('🔄 Inicializando base de datos...');
});