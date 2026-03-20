import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { obtenerUsuario } from "../db/usuarios.js";

export const perfilCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Ver tu perfil registrado o el de otro usuario")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuario del que quieres ver el perfil (opcional)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser("usuario") ?? interaction.user;

    await interaction.deferReply();

    const perfil = await obtenerUsuario(targetUser.id);

    if (!perfil) {
      const esPropioUsuario = targetUser.id === interaction.user.id;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle("⚠️ Sin perfil registrado")
            .setDescription(
              esPropioUsuario
                ? "No tienes un perfil todavía. Usa `/registrar` para crear el tuyo."
                : `**${targetUser.tag}** aún no se ha registrado en el bot.`
            ),
        ],
      });
      return;
    }

    const fechaRegistro = new Date(perfil.registradoEn);
    const fechaActualizado = new Date(perfil.actualizadoEn);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`👤 Perfil de ${perfil.apodo}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "🏷️ Apodo", value: perfil.apodo, inline: true },
        { name: "🎂 Edad", value: `${perfil.edad} años`, inline: true },
        { name: "🌍 País", value: perfil.pais ?? "No especificado", inline: true },
        { name: "💬 Estado sentimental", value: perfil.estado ?? "No especificado", inline: true },
        { name: "🆔 Discord", value: targetUser.tag, inline: true },
        { name: "📝 Bio", value: perfil.bio ?? "Sin descripción.", inline: false },
        {
          name: "📅 Registrado",
          value: `<t:${Math.floor(fechaRegistro.getTime() / 1000)}:D>`,
          inline: true,
        },
        {
          name: "✏️ Última actualización",
          value: `<t:${Math.floor(fechaActualizado.getTime() / 1000)}:R>`,
          inline: true,
        }
      )
      .setFooter({ text: "migajeria bot • Solo admins pueden actualizar perfiles" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
} as unknown as BotCommand;
