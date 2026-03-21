import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import * as MusicManager from "../music/manager.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function obtenerUrlTTS(texto: string, voz: string): Promise<string> {
  const encoded = encodeURIComponent(texto);

  try {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voz}&text=${encoded}`;
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    if (res.ok || res.status === 302 || res.redirected) return url;
  } catch {
    // Falla silenciosa, usamos fallback
  }

  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=es&client=tw-ob&ttsspeed=1`;
}

export const ttsCommand: BotCommand = {
  data: new SlashCommandBuilder()
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
        .setDescription("Elige la voz (por defecto: Enrique)")
        .setRequired(false)
        .addChoices(
          { name: "🇪🇸 Enrique — español masculino",    value: "Enrique" },
          { name: "🇪🇸 Conchita — español femenino",    value: "Conchita" },
          { name: "🇬🇧 Brian — inglés británico 😂",     value: "Brian" },
          { name: "👦 Justin — voz de niño",             value: "Justin" },
          { name: "🤖 Ivy — robótica/graciosa",          value: "Ivy" },
          { name: "🎭 Joey — dramático americano",       value: "Joey" }
        )
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

    const texto = interaction.options.getString("texto", true);
    const voz = interaction.options.getString("voz") ?? "Enrique";

    await interaction.deferReply({ ephemeral: true });

    const manager = MusicManager.manager;

    if (!manager) {
      await interaction.editReply("❌ El sistema de audio no está listo todavía. Espera unos segundos y reintenta.");
      return;
    }

    try {
      const ttsUrl = await obtenerUrlTTS(texto, voz);

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
          `❌ No se pudo cargar el audio TTS (tipo: ${result?.loadType ?? "desconocido"}). Intenta con un texto más corto.`
        );
        return;
      }

      const track = result.tracks[0];
      if (track.info) {
        track.info.title = `🔊 TTS: ${texto.slice(0, 50)}${texto.length > 50 ? "..." : ""}`;
        track.info.author = `Voz: ${voz}`;
      }

      player.queue.add(track);

      if (!player.playing && !player.paused) {
        await player.play({ paused: false });
        await interaction.editReply(`✅ Reproduciendo con voz **${voz}**: *"${texto}"*`);
      } else {
        await interaction.editReply(`➕ TTS en cola con voz **${voz}**: *"${texto}"*`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error en /tts:", msg);
      await interaction.editReply(`❌ Error interno: ${msg.slice(0, 200)}`);
    }
  },
} as unknown as BotCommand;

