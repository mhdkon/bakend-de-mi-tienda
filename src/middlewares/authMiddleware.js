import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const SECRET = process.env.SECRET || "mi_secreto_super_seguro";

export const auth = (peticion, respuesta, siguiente) => {
  const header = peticion.headers.authorization;
  if (!header) {
    return respuesta.status(401).json({ error: "No autorizado" });
  }

  const token = header.split(" ")[1];
  try {
    peticion.user = jwt.verify(token, SECRET);
    siguiente(); 
  } catch {
    return respuesta.status(401).json({ error: "Token inválido" });
  }
};
