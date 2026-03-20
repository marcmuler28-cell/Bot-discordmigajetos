import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { BotCommand } from "../index.js";

export const bromaCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("broma")
    .setDescription("Tenderle una trampa a alguien del server 😈")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("¿A quién le tendemos la trampa?")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const objetivo = interaction.options.getUser("usuario", true);

    if (objetivo.bot) {
      await interaction.reply({
        content: "naaaa pana, los bots no caen en eso jsjsjs",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (objetivo.id === interaction.user.id) {
      await interaction.reply({
        content: "bro... te querés hacer la broma a vos mismo? cringe jajaja",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.channel as TextChannel;
    if (!channel) {
      await interaction.reply({ content: "❌ No puedo operar en este canal.", flags: MessageFlags.Ephemeral });
      return;
    }

    // Confirmamos al que usó el comando sin que se vea en el chat
    await interaction.reply({
      content: `✅ Trampa activada para ${objetivo.username}, prepárate jsjsjs`,
      flags: MessageFlags.Ephemeral,
    });

    // El bot le pregunta al objetivo en el canal
    await channel.send(`<@${objetivo.id}> ¿estás en la cima? 🏔️`);

    // Esperamos la respuesta del objetivo en ese canal
    const filter = (msg: Message) => msg.author.id === objetivo.id;

    try {
      await channel.awaitMessages({ filter, max: 1, time: 60_000, errors: ["time"] });
      // Cuando responde cualquier cosa, el bot suelta la broma
      await channel.send(`de mi gampi 😭💀`);
    } catch {
      // Si no responde en 60 segundos, cancela silenciosamente
      await channel.send(`<@${objetivo.id}> ni contestó... igual de mi gampi 😭`);
    }
  },
} as unknown as BotCommand;
