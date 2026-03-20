import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { registrarUsuario, estaRegistrado } from "../db/usuarios.js";

export const registrarCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("registrar")
    .setDescription("Regístrate para poder usar todos los comandos del bot")
    .addStringOption((option) =>
      option
        .setName("apodo")
        .setDescription("¿Cómo quieres que te llame?")
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(32)
    )
    .addIntegerOption((option) =>
      option
        .setName("edad")
        .setDescription("¿Cuántos años tienes?")
        .setRequired(true)
        .setMinValue(13)
        .setMaxValue(100)
    )
    .addStringOption((option) =>
      option
        .setName("pais")
        .setDescription("¿De qué país eres? (ej: México, Colombia, España...)")
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(50)
    )
    .addStringOption((option) =>
      option
        .setName("estado")
        .setDescription("¿Cuál es tu situación sentimental?")
        .setRequired(true)
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
        .setDescription("Cuéntanos algo de ti (opcional)")
        .setRequired(false)
        .setMinLength(5)
        .setMaxLength(150)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const apodo = interaction.options.getString("apodo", true);
    const edad = interaction.options.getInteger("edad", true);
    const pais = interaction.options.getString("pais", true);
    const estado = interaction.options.getString("estado", true);
    const bio = interaction.options.getString("bio") ?? "Sin descripción.";

    await interaction.deferReply({ ephemeral: true });

    const yaRegistrado = await estaRegistrado(interaction.user.id);
    if (yaRegistrado) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle("⚠️ Ya estás registrado")
            .setDescription(
              "Ya tienes un perfil creado. Si necesitas actualizar tus datos, pídele a un administrador que use `/actualizar`."
            ),
        ],
      });
      return;
    }

    try {
      await registrarUsuario(
        interaction.user.id,
        interaction.user.username,
        apodo,
        edad,
        pais,
        estado,
        bio
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ ¡Registro exitoso!")
        .setDescription(`Bienvenido/a, **${apodo}**. Ya puedes usar todos los comandos del bot.`)
        .addFields(
          { name: "🏷️ Apodo", value: apodo, inline: true },
          { name: "🎂 Edad", value: `${edad} años`, inline: true },
          { name: "🌍 País", value: pais, inline: true },
          { name: "💬 Estado sentimental", value: estado, inline: true },
          { name: "📝 Bio", value: bio, inline: false }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: "Usa /historia para contarme tu situación y /ia para pedir consejo" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Error en /registrar:", err);
      await interaction.editReply("❌ Ocurrió un error al registrarte. Intenta de nuevo.");
    }
  },
} as unknown as BotCommand;
