import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../index.js";
import { manager } from "../music/manager.js";

export const volumenCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("volumen")
    .setDescription("Ajusta el volumen de la música (1-100)")
    .addIntegerOption((opt) =>
      opt
        .setName("nivel")
        .setDescription("Nivel de volumen entre 1 y 100")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

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

    const nivel = interaction.options.getInteger("nivel", true);
    await player.setVolume(nivel);

    const emoji =
      nivel <= 30 ? "🔈" : nivel <= 70 ? "🔉" : "🔊";

    await interaction.reply(
      `${emoji} Volumen ajustado a **${nivel}%**`
    );
  },
} as unknown as BotCommand;
