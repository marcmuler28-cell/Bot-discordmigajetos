import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { manager } from "../music/manager.js";

function isSoundCloudUrl(query: string): boolean {
  return (
    query.startsWith("https://soundcloud.com/") ||
    query.startsWith("https://on.soundcloud.com/") ||
    query.startsWith("http://soundcloud.com/") ||
    query.startsWith("http://on.soundcloud.com/")
  );
}

// Resuelve URLs cortas de SoundCloud (on.soundcloud.com) al link real
async function resolveScUrl(url: string): Promise<string> {
  if (!url.includes("on.soundcloud.com")) return url;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.url || url;
  } catch {
    return url;
  }
}

export const playCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Reproduce una canción de SoundCloud — nombre o URL de SoundCloud")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Nombre de la canción, artista o URL de SoundCloud")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: "❌ Debes estar en un canal de voz para usar este comando.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let query = interaction.options.getString("query", true);
    await interaction.deferReply();

    try {
      let player = manager.getPlayer(interaction.guildId);

      if (!player) {
        player = manager.createPlayer({
          guildId: interaction.guildId,
          voiceChannelId: voiceChannel.id,
          textChannelId: interaction.channelId,
          selfDeaf: true,
          selfMute: false,
          volume: 80,
        });
      }

      if (!player.connected) {
        await player.connect();
      }

      let searchPayload: { query: string; source?: string };

      if (isSoundCloudUrl(query)) {
        // Resolvemos la URL corta al link real si hace falta
        const resolvedUrl = await resolveScUrl(query);
        searchPayload = { query: resolvedUrl };
      } else {
        // Búsqueda por nombre en SoundCloud
        searchPayload = { query, source: "scsearch" };
      }

      const result = await player.search(searchPayload, interaction.user);

      if (
        !result ||
        result.loadType === "error" ||
        result.loadType === "empty"
      ) {
        await interaction.editReply(
          "❌ No encontré nada en SoundCloud. Probá con otro nombre o pegá una URL directa de SoundCloud."
        );
        return;
      }

      if (result.loadType === "playlist") {
        player.queue.add(result.tracks);
        await interaction.editReply(
          `✅ Playlist **${result.playlist?.title || "sin título"}** añadida con **${result.tracks.length}** canciones.`
        );
      } else {
        const track = result.tracks[0];
        player.queue.add(track);

        if (player.playing || player.paused) {
          await interaction.editReply(
            `➕ Añadido a la cola: **${track.info.title}** — ${track.info.author}`
          );
        }
      }

      if (!player.playing && !player.paused) {
        await player.play({ paused: false });
        if (result.loadType !== "playlist") {
          await interaction.editReply(
            `🎵 Reproduciendo: **${result.tracks[0].info.title}** — ${result.tracks[0].info.author}`
          );
        }
      }
    } catch (error) {
      console.error("Error en /play:", error);
      await interaction.editReply(
        "❌ Ocurrió un error al intentar reproducir. Asegúrate de que el servidor Lavalink esté activo."
      );
    }
  },
} as unknown as BotCommand;
