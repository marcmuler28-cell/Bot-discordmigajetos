import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { obtenerTop } from "../db/puntos.js";

const nivelEmoji: Record<string, string> = {
  leve: "🟡",
  medio: "🟠",
  "crítico": "💀",
};

const medallas = ["🥇", "🥈", "🥉"];

export const rankingCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("Muestra el top de migajeros con más puntosMigajero"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const top = await obtenerTop(10);

    if (top.length === 0) {
      await interaction.editReply(
        "📭 Aún no hay migajeros en el ranking. Usa **/historia** para contar tu situación y obtener tus puntos."
      );
      return;
    }

    const lista = top
      .map((entry, i) => {
        const medalla = medallas[i] ?? `**${i + 1}.**`;
        const emoji = nivelEmoji[entry.nivel] ?? "❓";
        return `${medalla} <@${entry.userId}> — **${entry.puntosMigajero} pts** ${emoji}\n> *${entry.mensaje}*`;
      })
      .join("\n\n");

    const embed = new EmbedBuilder()
      .setColor(0xff6b6b)
      .setTitle("💔 Ranking de Migajeros")
      .setDescription(lista)
      .setFooter({
        text: "Puntos calculados por IA • Usa /historia para actualizar tu puntuación",
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
} as unknown as BotCommand;
