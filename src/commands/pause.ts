import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../index.js";
import { manager } from "../music/manager.js";

export const pauseCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pausa la canción actual"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const player = manager.getPlayer(interaction.guildId);

    if (!player || !player.playing) {
      await interaction.reply({
        content: "❌ No hay ninguna canción reproduciéndose.",
        ephemeral: true,
      });
      return;
    }

    if (player.paused) {
      await interaction.reply({
        content: "⚠️ La música ya está pausada. Usa /resume para reanudarla.",
        ephemeral: true,
      });
      return;
    }

    await player.pause();
    await interaction.reply("⏸️ Música pausada. Usa /resume para continuar.");
  },
} as unknown as BotCommand;
