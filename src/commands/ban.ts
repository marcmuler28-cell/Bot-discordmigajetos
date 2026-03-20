import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";

export const banCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banea a un usuario del servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario a banear")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("razon")
        .setDescription("Razón del baneo")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("borrar_mensajes")
        .setDescription("Días de mensajes a borrar (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: "❌ No tienes permisos para banear usuarios.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("usuario", true);
    const reason = interaction.options.getString("razon") ?? "Sin razón especificada";
    const deleteMessageDays = interaction.options.getInteger("borrar_mensajes") ?? 0;
    const member = interaction.guild?.members.cache.get(targetUser.id) as GuildMember | undefined;

    if (member) {
      if (!member.bannable) {
        await interaction.reply({
          content: "❌ No puedo banear a este usuario. Puede tener un rol superior al mío.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (member.id === interaction.user.id) {
        await interaction.reply({
          content: "❌ No puedes banearte a ti mismo.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    try {
      await interaction.guild?.bans.create(targetUser.id, {
        reason,
        deleteMessageSeconds: deleteMessageDays * 86400,
      });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🔨 Usuario Baneado")
        .addFields(
          { name: "👤 Usuario", value: `${targetUser.tag}`, inline: true },
          { name: "🛡️ Moderador", value: `${interaction.user.tag}`, inline: true },
          { name: "📝 Razón", value: reason },
          {
            name: "🗑️ Mensajes borrados",
            value: `${deleteMessageDays} día(s)`,
            inline: true,
          }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({
        content: "❌ Ocurrió un error al intentar banear al usuario.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
} as unknown as BotCommand;
