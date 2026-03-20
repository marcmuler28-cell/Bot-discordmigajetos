import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
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
        ephemeral: true,
      });
      return;
    }

    if (!player.paused) {
      await interaction.reply({
        content: "⚠️ La música no está pausada.",
        ephemeral: true,
      });
      return;
    }

    await player.resume();
    await interaction.reply("▶️ Música reanudada.");
  },
} as unknown as BotCommand;
