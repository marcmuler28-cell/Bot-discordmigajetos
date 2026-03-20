import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../index.js";

export const pingCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Verifica la latencia del bot"),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({
      content: "Calculando ping...",
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 **Pong!**\n📡 Latencia: \`${latency}ms\`\n💓 API: \`${apiLatency}ms\``
    );
  },
} as unknown as BotCommand;
