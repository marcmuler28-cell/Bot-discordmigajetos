import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import * as MusicManager from "../music/manager.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const VOCES_FALLBACK = [
  { name: "🇦🇷 Argentino", value: "argentino" },
  { name: "🎤 Marc", value: "marc" },
  { name: "🎙️ Voz por defecto", value: "default" },
];

// Construye el SlashCommandBuilder con las voces que se le pasen
export function buildTtsData(voces: { name: string; value: string }[]) {
  return new SlashCommandBuilder()
    .setName("tts")
    .setDescription("El bot lee un texto en el canal de voz")
    .addStringOption((opt) =>
      opt
        .setName("texto")
        .setDescription("Texto que quieres que el bot lea en voz alta")
        .setRequired(true)
        .setMaxLength(200)
    )
    .addStringOption((opt) =>
      opt
        .setName("voz")
        .setDescription("Elige la voz con la que quieres que hable el bot")
        .setRequired(false)
        .addChoices(...voces)
    );
}

async function getTtsAudioUrl(texto: string, voz: string): Promise<string> {
  const ttsServerUrl = process.env.TTS_SERVER_URL;

  if (ttsServerUrl) {
    const encoded = encodeURIComponent(texto);
    const generateUrl = `${ttsServerUrl}/generate?text=${encoded}&lang=es&voice=${encodeURIComponent(voz)}`;

    const resp = await fetch(generateUrl, {
      signal: AbortSignal.timeout(90_000),
    });

    if (!resp.ok) {
      throw new Error(`Error del servidor TTS: ${resp.status}`);
    }

    const data = (await resp.json()) as { token: string; audio_url: string };
    return `${ttsServerUrl}${data.audio_url}`;
  }

  const encoded = encodeURIComponent(texto);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=es&client=tw-ob&ttsspeed=1`;
}

export const ttsCommand: BotCommand = {
  data: buildTtsData(VOCES_FALLBACK),

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

    const texto = interaction.options.getString("texto", true);
    const voz = interaction.options.getString("voz") ?? "argentino";
    const usingCustomServer = !!process.env.TTS_SERVER_URL;

    await interaction.deferReply({ ephemeral: true });

    const manager = MusicManager.manager;

    if (!manager) {
      await interaction.editReply("❌ El sistema de audio no está listo todavía. Espera unos segundos y reintenta.");
      return;
    }

    try {
      if (usingCustomServer) {
        await interaction.editReply(`⏳ Generando audio con voz **${voz}**... espera un momento.`);
      }

      const ttsUrl = await getTtsAudioUrl(texto, voz);

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
      } else {
        player.textChannelId = interaction.channelId;
        if (player.voiceChannelId !== voiceChannel.id) {
          player.voiceChannelId = voiceChannel.id;
        }
      }

      if (!player.connected) {
        await player.connect();
        await sleep(1500);
      }

      const result = await player.search({ query: ttsUrl }, interaction.user);

      if (!result || result.loadType === "error" || result.loadType === "empty") {
        await interaction.editReply(
          `❌ No se pudo cargar el audio TTS (tipo: ${result?.loadType ?? "desconocido"}).`
        );
        return;
      }

      const track = result.tracks[0];
      if (track.info) {
        track.info.title = `🔊 TTS: ${texto.slice(0, 50)}${texto.length > 50 ? "..." : ""}`;
        track.info.author = usingCustomServer ? `Voz IA: ${voz}` : "Voz: Google TTS";
      }

      player.queue.add(track);

      if (!player.playing && !player.paused) {
        await player.play({ paused: false });
        await interaction.editReply(
          usingCustomServer
            ? `✅ Reproduciendo con voz **${voz}**: *"${texto}"*`
            : `✅ Reproduciendo: *"${texto}"*`
        );
      } else {
        await interaction.editReply(`➕ TTS en cola: *"${texto}"*`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error en /tts:", msg);
      await interaction.editReply(`❌ Error interno: ${msg.slice(0, 200)}`);
    }
  },
} as unknown as BotCommand;
