import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";

export const helpCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Muestra la lista de comandos disponibles"),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📖 Comandos disponibles")
      .setDescription("Aquí están todos los comandos que puedes usar:")
      .addFields(
        { name: "👤 __Perfil & Registro__", value: "\u200b" },
        { name: "/registrar", value: "Crea tu perfil para usar el bot", inline: true },
        { name: "/perfil", value: "Ve tu perfil o el de otro usuario", inline: true },
        { name: "/actualizar", value: "🔒 Actualiza el perfil de un usuario *(solo admins)*", inline: true },
        { name: "🛠️ __Utilidades__", value: "\u200b" },
        { name: "/ping", value: "Verifica la latencia del bot", inline: true },
        { name: "/help", value: "Muestra esta lista de comandos", inline: true },
        { name: "/info", value: "Muestra información del servidor", inline: true },
        { name: "🎭 __Entretenimiento__", value: "\u200b" },
        { name: "/meme", value: "Trae un meme aleatorio de Reddit", inline: true },
        { name: "🛡️ __Moderación__", value: "\u200b" },
        { name: "/kick", value: "Expulsa a un usuario", inline: true },
        { name: "/ban", value: "Banea a un usuario", inline: true },
        { name: "/clear", value: "Borra mensajes del canal", inline: true },
        { name: "/crearcanal", value: "🔒 La IA crea un canal automáticamente *(requiere Gestionar Canales)*", inline: true },
        { name: "🤖 __Inteligencia Artificial__", value: "\u200b" },
        { name: "/historia", value: "Cuéntame tu situación amorosa", inline: true },
        { name: "/ia", value: "Pídeme consejo sobre tu historia", inline: true },
      )
      .setFooter({ text: "migajeria bot • 🔒 = Requiere permisos especiales" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
} as unknown as BotCommand;
