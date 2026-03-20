import { getCollection } from "../db/mongo.js";

interface UserStory {
  userId: string;
  story: string;
  updatedAt: Date;
}

const memoryFallback = new Map<string, string>();
let mongoAvailable: boolean | null = null;

async function tryGetCollection() {
  try {
    const col = await getCollection<UserStory>("historias");
    mongoAvailable = true;
    return col;
  } catch {
    mongoAvailable = false;
    return null;
  }
}

export async function saveStory(userId: string, story: string): Promise<void> {
  const col = await tryGetCollection();
  if (col) {
    await col.updateOne(
      { userId },
      { $set: { userId, story, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log(`💾 Historia guardada en MongoDB para ${userId}`);
  } else {
    memoryFallback.set(userId, story);
    console.log(`⚠️ MongoDB no disponible — historia guardada en memoria para ${userId}`);
  }
}

export async function getStory(userId: string): Promise<string | undefined> {
  const col = await tryGetCollection();
  if (col) {
    const doc = await col.findOne({ userId });
    return doc?.story;
  } else {
    return memoryFallback.get(userId);
  }
}

export async function hasStory(userId: string): Promise<boolean> {
  const col = await tryGetCollection();
  if (col) {
    const count = await col.countDocuments({ userId });
    return count > 0;
  } else {
    return memoryFallback.has(userId);
  }
}

export async function deleteStory(userId: string): Promise<void> {
  const col = await tryGetCollection();
  if (col) {
    await col.deleteOne({ userId });
  } else {
    memoryFallback.delete(userId);
  }
}

export function isMongoConnected(): boolean | null {
  return mongoAvailable;
}
