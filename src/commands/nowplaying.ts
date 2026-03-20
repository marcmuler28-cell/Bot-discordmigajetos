import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { manager, formatDuration } from "../music/manager.js";

export const nowplayingCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Muestra la canción que se está reproduciendo"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const player = manager.getPlayer(interaction.guildId);

    if (!player?.queue.current) {
      await interaction.reply({
        content: "❌ No hay ninguna canción reproduciéndose.",
        ephemeral: true,
      });
      return;
    }

    const track = player.queue.current;
    const position = player.position;
    const duration = track.info.duration;

    const bar = createProgressBar(position, duration);

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle("🎵 Reproduciendo ahora")
      .setDescription(`**[${track.info.title}](${track.info.uri})**`)
      .addFields(
        { name: "🎤 Artista", value: track.info.author || "Desconocido", inline: true },
        {
          name: "⏱️ Duración",
          value: track.info.isStream
            ? "🔴 En vivo"
            : `${formatDuration(position)} / ${formatDuration(duration)}`,
          inline: true,
        },
        {
          name: "🔊 Estado",
          value: player.paused ? "⏸️ Pausado" : "▶️ Reproduciendo",
          inline: true,
        },
        { name: "Progreso", value: bar }
      )
      .setThumbnail(track.info.artworkUrl ?? null);

    await interaction.reply({ embeds: [embed] });
  },
} as unknown as BotCommand;

function createProgressBar(position: number, duration: number): string {
  if (!duration) return `▬▬▬▬▬🔘▬▬▬▬▬`;
  const filled = Math.min(Math.floor((position / duration) * 11), 11);
  return "▬".repeat(filled) + "🔘" + "▬".repeat(11 - filled);
}
