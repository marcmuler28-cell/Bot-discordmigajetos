import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { manager, formatDuration } from "../music/manager.js";

export const queueCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Muestra la cola de reproducción"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const player = manager.getPlayer(interaction.guildId);

    if (!player?.queue.current) {
      await interaction.reply({
        content: "❌ No hay canciones en la cola.",
        ephemeral: true,
      });
      return;
    }

    const current = player.queue.current;
    const upcoming = player.queue.tracks.slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle("🎵 Cola de reproducción")
      .setDescription(
        `**Reproduciendo:** [${current.info.title}](${current.info.uri}) — ${current.info.author}`
      )
      .setThumbnail(current.info.artworkUrl ?? null);

    if (upcoming.length > 0) {
      const list = upcoming
        .map(
          (t, i) =>
            `**${i + 1}.** [${t.info.title}](${t.info.uri}) — ${t.info.author} [${
              t.info.isStream ? "🔴 En vivo" : formatDuration(t.info.duration)
            }]`
        )
        .join("\n");

      embed.addFields({
        name: `📋 Próximas (${player.queue.tracks.length} en total)`,
        value: list,
      });
    } else {
      embed.addFields({ name: "📋 Cola", value: "No hay más canciones en la cola." });
    }

    await interaction.reply({ embeds: [embed] });
  },
} as unknown as BotCommand;
