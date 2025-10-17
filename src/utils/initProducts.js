import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function inicializarProductos(productosCol) {
  const rutaImg = path.join(__dirname, "../../public/img");
  const imagenes = fs.readdirSync(rutaImg);

  // 1️⃣ Eliminar productos que ya no existen físicamente
  await productosCol.deleteMany({
    imagen: { $nin: imagenes.map(f => "/img/" + f) }
  });

  // 2️⃣ Obtener imágenes que ya existen en la DB
  const productosExistentes = await productosCol.find().toArray();
  const imagenesExistentes = productosExistentes.map(p => p.imagen);

  // 3️⃣ Insertar solo los nuevos productos
  const productosNuevos = imagenes
    .filter(f => !imagenesExistentes.includes("/img/" + f))
    .map((archivo, i) => ({
      nombre: "Zapato " + (productosExistentes.length + i + 1),
      precio: Math.floor(Math.random() * 50) + 10, // Precio aleatorio opcional
      imagen: "/img/" + archivo,
    }));

  if (productosNuevos.length > 0) {
    console.log("Insertando productos nuevos:", productosNuevos.map(p => p.nombre));
    await productosCol.insertMany(productosNuevos);
  //  console.log(" Productos sincronizados con la carpeta /img");
  } else {
    //console.log(" Todos los productos ya están sincronizados");
  }
}
