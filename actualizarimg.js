import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

async function actualizarProductos() {
  const client = await MongoClient.connect(process.env.DB_URI);
  const db = client.db("tiendaDB"); 
  const productosCol = db.collection("productos");

  const carpetaImg = path.join(process.cwd(), "public/img");

  const archivos = fs.readdirSync(carpetaImg);
  const imagenesActuales = archivos.map(f => "/img/" + f);

  // Eliminar productos que ya no tienen imagen
  const resultadoEliminar = await productosCol.deleteMany({
    imagen: { $nin: imagenesActuales }
  });
  // console.log(` Productos eliminados: ${resultadoEliminar.deletedCount}`);

  // Obtener productos existentes
  const productosExistentes = await productosCol.find().toArray();
  const imagenesExistentes = productosExistentes.map(p => p.imagen);

  // Crear productos nuevos para imágenes que no existan
  const productosNuevos = imagenesActuales
    .filter(img => !imagenesExistentes.includes(img))
    .map((imagen, i) => ({
      nombre: path.basename(imagen, path.extname(imagen)), 
      precio: Math.floor(Math.random() * 50) + 10,
      imagen
    }));

  if (productosNuevos.length > 0) {
    await productosCol.insertMany(productosNuevos);
    // console.log(` Productos añadidos: ${productosNuevos.map(p => p.nombre).join(", ")}`);
  } else {
    // console.log(" No hay productos nuevos que agregar.");
  }

  const total = await productosCol.countDocuments();
  // console.log(` Total de productos en DB: ${total}`);

  await client.close();
}

actualizarProductos().catch(err => {
  // console.error(" Error al actualizar productos:", err);
});
