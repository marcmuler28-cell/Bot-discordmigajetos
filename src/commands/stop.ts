import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../index.js";
import { manager } from "../music/manager.js";

export const stopCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Detiene la música y vacía la cola"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const player = manager.getPlayer(interaction.guildId);

    if (!player) {
      await interaction.reply({
        content: "❌ No hay nada reproduciéndose.",
        ephemeral: true,
      });
      return;
    }

    await player.destroy();
    await interaction.reply("⏹️ Música detenida y cola vaciada. ¡Hasta pronto!");
  },
} as unknown as BotCommand;
