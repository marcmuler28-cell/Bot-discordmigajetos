import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { manager } from "../music/manager.js";

export const resumeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Reanuda la música pausada"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const player = manager.getPlayer(interaction.guildId);

    if (!player) {
      await interaction.reply({
        content: "❌ No hay ningún reproductor activo.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!player.paused) {
      await interaction.reply({
        content: "⚠️ La música no está pausada.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await player.resume();
    await interaction.reply("▶️ Música reanudada.");
  },
} as unknown as BotCommand;
