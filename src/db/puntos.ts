import { getCollection } from "./mongo.js";

export interface PuntosMigajero {
  userId: string;
  username: string;
  puntosMigajero: number;
  nivel: "leve" | "medio" | "crítico";
  mensaje: string;
  calculadoEn: Date;
}

async function tryGetCollection() {
  try {
    return await getCollection<PuntosMigajero>("puntos");
  } catch {
    return null;
  }
}

// Guarda o actualiza los puntos de un usuario sin tocar la colección "historias"
export async function guardarPuntos(
  userId: string,
  username: string,
  puntos: number,
  nivel: "leve" | "medio" | "crítico",
  mensaje: string
): Promise<void> {
  const col = await tryGetCollection();
  if (!col) return;
  await col.updateOne(
    { userId },
    {
      $set: {
        userId,
        username,
        puntosMigajero: puntos,
        nivel,
        mensaje,
        calculadoEn: new Date(),
      },
    },
    { upsert: true }
  );
  console.log(`📊 Puntos guardados para ${username}: ${puntos} (${nivel})`);
}

// Obtiene el top de usuarios ordenados por puntosMigajero
export async function obtenerTop(limite = 10): Promise<PuntosMigajero[]> {
  const col = await tryGetCollection();
  if (!col) return [];
  return col.find().sort({ puntosMigajero: -1 }).limit(limite).toArray();
}

// Obtiene los puntos de un usuario específico
export async function obtenerPuntos(userId: string): Promise<PuntosMigajero | null> {
  const col = await tryGetCollection();
  if (!col) return null;
  return (await col.findOne({ userId })) ?? null;
}
