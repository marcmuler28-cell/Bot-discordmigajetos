import { MongoClient, ServerApiVersion, Collection, Document } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required.");
}

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
  tlsAllowInvalidCertificates: false,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
});

let connected = false;

export async function connect() {
  if (!connected) {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    connected = true;
    console.log("✅ Conectado a MongoDB Atlas — base de datos: migajeria");
  }
}

export async function getCollection<T extends Document>(
  collectionName: string
): Promise<Collection<T>> {
  await connect();
  return client.db("migajeria").collection<T>(collectionName);
}

process.on("SIGINT", async () => {
  await client.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await client.close();
  process.exit(0);
});
