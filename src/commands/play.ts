import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { manager } from "../music/manager.js";

function isUrl(str: string): boolean {
  try { new URL(str); return str.startsWith("http"); } catch { return false; }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const playCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Reproduce una canción, URL de YouTube/SoundCloud o búsqueda de texto")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Nombre, artista o URL de YouTube/SoundCloud")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: "❌ Debes estar en un canal de voz para usar este comando.",
        ephemeral: true,
      });
      return;
    }

    const query = interaction.options.getString("query", true);
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
          volume: 50,
        });
      } else {
        // Actualiza el canal de texto y voz por si cambió
        player.textChannelId = interaction.channelId;
        if (player.voiceChannelId !== voiceChannel.id) {
          player.voiceChannelId = voiceChannel.id;
        }
      }

      if (!player.connected) {
        await player.connect();
        // Espera a que la conexión de voz se establezca con Lavalink
        await sleep(1500);
      }

      let result;

      if (isUrl(query)) {
        result = await player.search({ query }, interaction.user);
      } else {
        result = await player.search({ query, source: "ytsearch" }, interaction.user);
        if (!result || result.loadType === "error" || result.loadType === "empty") {
          result = await player.search({ query, source: "ytmsearch" }, interaction.user);
        }
      }

      if (!result || result.loadType === "error" || result.loadType === "empty") {
        await interaction.editReply(
          "❌ No encontré ninguna canción. Intenta con otro nombre o una URL de YouTube/SoundCloud."
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
        "❌ Ocurrió un error al intentar reproducir. Intenta de nuevo."
      );
    }
  },
} as unknown as BotCommand;
