import { LavalinkManager, SearchPlatform } from "lavalink-client";
import { Client, EmbedBuilder, TextChannel } from "discord.js";

export let manager: LavalinkManager;

export function initLavalink(client: Client<true>) {
  manager = new LavalinkManager({
    nodes: [
      {
        authorization: process.env.LAVALINK_PASSWORD || "hope you have a great day",
        host: process.env.LAVALINK_HOST || "lavalink.serenetia.com",
        port: Number(process.env.LAVALINK_PORT) || 443,
        id: "main-node",
        secure: true,
        requestSignalTimeoutMS: 30000,
        retryAmount: 5,
        retryDelay: 5000,
      },
      {
        authorization: "youshallnotpass",
        host: "lavalink.jirayu.net",
        port: 13592,
        id: "backup-node",
        secure: false,
        requestSignalTimeoutMS: 30000,
        retryAmount: 5,
        retryDelay: 5000,
      },
    ],
    sendToShard: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
    client: {
      id: client.user.id,
      username: client.user.username,
    },
    playerOptions: {
      clientBasedPositionUpdateInterval: 500,
      defaultSearchPlatform: "ytmsearch" as SearchPlatform,
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false,
      },
      onEmptyQueue: {
        destroyAfterMs: 30_000,
      },
    },
  });

  manager.on("trackStart", async (player, track) => {
    if (!player.textChannelId) return;
    const channel = client.channels.cache.get(player.textChannelId);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle("🎵 Reproduciendo ahora")
      .setDescription(`**[${track.info.title}](${track.info.uri})**`)
      .addFields(
        { name: "🎤 Artista", value: track.info.author || "Desconocido", inline: true },
        {
          name: "⏱️ Duración",
          value: track.info.isStream ? "🔴 En vivo" : formatDuration(track.info.duration),
          inline: true,
        }
      )
      .setThumbnail(track.info.artworkUrl ?? null)
      .setFooter({ text: "Sistema de música con Lavalink" });

    await (channel as TextChannel).send({ embeds: [embed] });
  });

  manager.on("trackError", async (player, track) => {
    if (!player.textChannelId) return;
    const channel = client.channels.cache.get(player.textChannelId);
    if (!channel?.isTextBased()) return;
    await (channel as TextChannel).send(
      `❌ Error al reproducir **${track?.info?.title || "la canción"}**. Saltando a la siguiente...`
    );
  });

  manager.on("queueEnd", async (player) => {
    if (!player.textChannelId) return;
    const channel = client.channels.cache.get(player.textChannelId);
    if (!channel?.isTextBased()) return;
    await (channel as TextChannel).send("✅ La cola terminó. ¡Hasta pronto! 👋");
  });

  manager.on("nodeError", (node, error) => {
    console.error(`❌ Error en nodo Lavalink [${node.id}]:`, error?.message || error);
  });

  manager.on("nodeConnect", (node) => {
    console.log(`✅ Nodo Lavalink conectado: ${node.id}`);
  });

  manager.on("nodeDisconnect", (node) => {
    console.warn(`⚠️ Nodo Lavalink desconectado: ${node.id}`);
  });

  // Captura errores internos del NodeManager para evitar que cierren el proceso
  manager.nodeManager.on("error", (node, error) => {
    console.error(`⚠️ NodeManager error [${node?.id ?? "unknown"}]:`, error?.message || error);
  });

  manager.init(client.user.id, { shards: "auto", clientId: client.user.id });
  console.log("🎵 Lavalink Manager iniciado.");
  return manager;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
