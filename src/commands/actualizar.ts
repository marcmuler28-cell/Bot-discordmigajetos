import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { actualizarUsuario, obtenerUsuario } from "../db/usuarios.js";

export const actualizarCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("actualizar")
    .setDescription("(Solo admins) Actualiza el perfil de un usuario registrado")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuario cuyo perfil quieres actualizar")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("apodo")
        .setDescription("Nuevo apodo")
        .setRequired(false)
        .setMinLength(2)
        .setMaxLength(32)
    )
    .addIntegerOption((option) =>
      option
        .setName("edad")
        .setDescription("Nueva edad")
        .setRequired(false)
        .setMinValue(13)
        .setMaxValue(100)
    )
    .addStringOption((option) =>
      option
        .setName("pais")
        .setDescription("Nuevo país")
        .setRequired(false)
        .setMinLength(2)
        .setMaxLength(50)
    )
    .addStringOption((option) =>
      option
        .setName("estado")
        .setDescription("Nuevo estado sentimental")
        .setRequired(false)
        .addChoices(
          { name: "💔 Soltero/a", value: "💔 Soltero/a" },
          { name: "💕 En relación", value: "💕 En relación" },
          { name: "😵 Es complicado", value: "😵 Es complicado" },
          { name: "💘 Enamorado/a (sin pareja)", value: "💘 Enamorado/a (sin pareja)" },
          { name: "🔒 Prefiero no decir", value: "🔒 Prefiero no decir" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("bio")
        .setDescription("Nueva bio")
        .setRequired(false)
        .setMinLength(5)
        .setMaxLength(150)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "❌ Solo los administradores pueden usar este comando.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("usuario", true);
    const nuevoApodo = interaction.options.getString("apodo");
    const nuevaEdad = interaction.options.getInteger("edad");
    const nuevoPais = interaction.options.getString("pais");
    const nuevoEstado = interaction.options.getString("estado");
    const nuevaBio = interaction.options.getString("bio");

    if (!nuevoApodo && !nuevaEdad && !nuevoPais && !nuevoEstado && !nuevaBio) {
      await interaction.reply({
        content: "❌ Debes especificar al menos un campo para actualizar.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const perfil = await obtenerUsuario(targetUser.id);
    if (!perfil) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("❌ Usuario no registrado")
            .setDescription(`**${targetUser.tag}** no tiene un perfil registrado en el bot.`),
        ],
      });
      return;
    }

    const campos: Partial<{ apodo: string; edad: number; pais: string; estado: string; bio: string }> = {};
    if (nuevoApodo) campos.apodo = nuevoApodo;
    if (nuevaEdad) campos.edad = nuevaEdad;
    if (nuevoPais) campos.pais = nuevoPais;
    if (nuevoEstado) campos.estado = nuevoEstado;
    if (nuevaBio) campos.bio = nuevaBio;

    try {
      await actualizarUsuario(targetUser.id, campos);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("✏️ Perfil actualizado")
        .setDescription(`El perfil de **${targetUser.tag}** fue actualizado correctamente.`)
        .addFields(
          { name: "🏷️ Apodo", value: nuevoApodo ?? perfil.apodo, inline: true },
          { name: "🎂 Edad", value: `${nuevaEdad ?? perfil.edad} años`, inline: true },
          { name: "🌍 País", value: nuevoPais ?? perfil.pais, inline: true },
          { name: "💬 Estado", value: nuevoEstado ?? perfil.estado, inline: true },
          { name: "📝 Bio", value: nuevaBio ?? perfil.bio, inline: false },
          { name: "🛡️ Actualizado por", value: interaction.user.tag, inline: true }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Error en /actualizar:", err);
      await interaction.editReply("❌ Ocurrió un error al actualizar el perfil.");
    }
  },
} as unknown as BotCommand;
