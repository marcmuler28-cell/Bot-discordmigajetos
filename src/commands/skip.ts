import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { manager } from "../music/manager.js";

export const skipCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Salta la canción actual"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const player = manager.getPlayer(interaction.guildId);

    if (!player || !player.playing) {
      await interaction.reply({
        content: "❌ No hay ninguna canción reproduciéndose.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const current = player.queue.current;
    await player.skip();
    await interaction.reply(
      `⏭️ Saltada: **${current?.info.title || "canción actual"}**`
    );
  },
} as unknown as BotCommand;
