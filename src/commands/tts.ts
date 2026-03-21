import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import * as MusicManager from "../music/manager.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const VOICE_LANGS: Record<string, string> = {
  Enrique:   "es",
  Valentina: "pt-BR",
  Brian:     "en-GB",
  Justin:    "en",
  Pierre:    "fr",
  Klaus:     "de",
};

function buildTtsUrl(texto: string, voz: string): string {
  const lang = VOICE_LANGS[voz] ?? "es";
  const encoded = encodeURIComponent(texto);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob&ttsspeed=1`;
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
          { name: "🇪🇸 Enrique — español",              value: "Enrique"   },
          { name: "🇧🇷 Valentina — portugués brasileño", value: "Valentina" },
          { name: "🇬🇧 Brian — inglés británico",        value: "Brian"     },
          { name: "🇺🇸 Justin — inglés americano",       value: "Justin"    },
          { name: "🇫🇷 Pierre — francés",                value: "Pierre"    },
          { name: "🇩🇪 Klaus — alemán",                  value: "Klaus"     }
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
      const ttsUrl = buildTtsUrl(texto, voz);

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

