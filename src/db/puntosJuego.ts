import { getCollection } from "./mongo.js";

interface PuntosJuego {
  userId: string;
  username: string;
  puntos: number;
}

async function tryGetCollection() {
  try {
    return await getCollection<PuntosJuego>("puntosJuego");
  } catch {
    return null;
  }
}

/**
 * Suma puntos al usuario y devuelve el total acumulado.
 */
export async function sumarPuntosJuego(
  userId: string,
  username: string,
  cantidad: number
): Promise<number> {
  const col = await tryGetCollection();
  if (!col) return cantidad;

  await col.updateOne(
    { userId },
    { $inc: { puntos: cantidad }, $set: { userId, username } },
    { upsert: true }
  );

  const doc = await col.findOne({ userId });
  return doc?.puntos ?? cantidad;
}

/**
 * Devuelve el ranking del minijuego.
 */
export async function obtenerTopJuego(limite = 10): Promise<PuntosJuego[]> {
  const col = await tryGetCollection();
  if (!col) return [];
  return col.find().sort({ puntos: -1 }).limit(limite).toArray();
}

/**
 * Devuelve los puntos de un usuario específico.
 */
export async function obtenerPuntosJuego(userId: string): Promise<number> {
  const col = await tryGetCollection();
  if (!col) return 0;
  const doc = await col.findOne({ userId });
  return doc?.puntos ?? 0;
}
