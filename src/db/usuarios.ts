import { getCollection } from "./mongo.js";

export interface UserProfile {
  userId: string;
  username: string;
  apodo: string;
  edad: number;
  pais: string;
  estado: string;
  bio: string;
  registradoEn: Date;
  actualizadoEn: Date;
}

const memoryFallback = new Map<string, UserProfile>();

async function tryGetCollection() {
  try {
    return await getCollection<UserProfile>("usuarios");
  } catch {
    return null;
  }
}

export async function registrarUsuario(
  userId: string,
  username: string,
  apodo: string,
  edad: number,
  pais: string,
  estado: string,
  bio: string
): Promise<void> {
  const col = await tryGetCollection();
  const now = new Date();
  const data: UserProfile = {
    userId,
    username,
    apodo,
    edad,
    pais,
    estado,
    bio,
    registradoEn: now,
    actualizadoEn: now,
  };

  if (col) {
    await col.insertOne(data);
  } else {
    memoryFallback.set(userId, data);
  }
}

export async function actualizarUsuario(
  userId: string,
  campos: Partial<Pick<UserProfile, "apodo" | "edad" | "pais" | "estado" | "bio">>
): Promise<boolean> {
  const col = await tryGetCollection();
  const now = new Date();

  if (col) {
    const result = await col.updateOne(
      { userId },
      { $set: { ...campos, actualizadoEn: now } }
    );
    return result.matchedCount > 0;
  } else {
    const existing = memoryFallback.get(userId);
    if (!existing) return false;
    memoryFallback.set(userId, { ...existing, ...campos, actualizadoEn: now });
    return true;
  }
}

export async function obtenerUsuario(userId: string): Promise<UserProfile | null> {
  const col = await tryGetCollection();
  if (col) {
    return (await col.findOne({ userId })) ?? null;
  } else {
    return memoryFallback.get(userId) ?? null;
  }
}

export async function estaRegistrado(userId: string): Promise<boolean> {
  const col = await tryGetCollection();
  if (col) {
    const count = await col.countDocuments({ userId });
    return count > 0;
  } else {
    return memoryFallback.has(userId);
  }
}
