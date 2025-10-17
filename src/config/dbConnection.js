import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

export async function usarDB(callback) {
  let cliente;
  try {
    // console.log(" Conectando a MongoDB..."); // <- comentado
    cliente = await MongoClient.connect(process.env.DB_URI);
    const db = cliente.db("tiendaDB");

    const usuariosCol = db.collection("usuarios");
    const productosCol = db.collection("productos");
    const carritoCol = db.collection("carrito");

    await callback({ usuariosCol, productosCol, carritoCol });
  } catch (error) {
    console.log(" Error DB:", error);
  } finally {
    if (cliente) {
      await cliente.close();
    }
  }
}
