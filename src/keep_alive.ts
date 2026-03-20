import express from "express";

const app = express();

app.get("/", (_req, res) => {
  res.send("🤖 Bot de Discord activo y funcionando!");
});

app.get("/ping", (_req, res) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

export function keepAlive() {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    const domains = process.env.REPLIT_DOMAINS;
    const url = domains ? `https://${domains.split(",")[0]}` : `http://localhost:${port}`;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌐 Servidor keep-alive iniciado");
    console.log(`📍 URL para UptimeRobot: ${url}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });
}
