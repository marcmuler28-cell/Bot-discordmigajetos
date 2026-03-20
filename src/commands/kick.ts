import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";

export const kickCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsa a un usuario del servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario a expulsar")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("razon")
        .setDescription("Razón de la expulsión")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({
        content: "❌ No tienes permisos para expulsar usuarios.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("usuario", true);
    const reason = interaction.options.getString("razon") ?? "Sin razón especificada";
    const member = interaction.guild?.members.cache.get(targetUser.id) as GuildMember | undefined;

    if (!member) {
      await interaction.reply({
        content: "❌ No se encontró al usuario en este servidor.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: "❌ No puedo expulsar a este usuario. Puede tener un rol superior al mío.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (member.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ No puedes expulsarte a ti mismo.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await member.kick(reason);

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle("👢 Usuario Expulsado")
        .addFields(
          { name: "👤 Usuario", value: `${targetUser.tag}`, inline: true },
          { name: "🛡️ Moderador", value: `${interaction.user.tag}`, inline: true },
          { name: "📝 Razón", value: reason }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({
        content: "❌ Ocurrió un error al intentar expulsar al usuario.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
} as unknown as BotCommand;
