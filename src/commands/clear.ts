import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { BotCommand } from "../index.js";

export const clearCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Borra mensajes del canal actual")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de mensajes a borrar (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: "❌ No tienes permisos para borrar mensajes.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const amount = interaction.options.getInteger("cantidad", true);
    const channel = interaction.channel as TextChannel;

    if (!channel || !("bulkDelete" in channel)) {
      await interaction.reply({
        content: "❌ Este comando solo funciona en canales de texto.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const deleted = await channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setColor(0x00bfff)
        .setTitle("🧹 Mensajes Eliminados")
        .setDescription(
          `Se eliminaron **${deleted.size}** mensaje(s) en ${channel}.`
        )
        .addFields(
          { name: "🛡️ Moderador", value: interaction.user.tag, inline: true },
          { name: "📌 Canal", value: `${channel}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({
        content:
          "❌ No se pudieron borrar los mensajes. Los mensajes de más de 14 días no se pueden borrar con este comando.",
      });
    }
  },
} as unknown as BotCommand;
