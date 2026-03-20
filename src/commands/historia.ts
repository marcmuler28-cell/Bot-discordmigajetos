import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { BotCommand } from "../index.js";
import { saveStory, getStory } from "../ai/stories.js";
import { analizarHistoria } from "../ai/analisis.js";
import { guardarPuntos } from "../db/puntos.js";

export const historiaCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("historia")
    .setDescription("Cuéntame (o actualiza) tu historia amorosa para que pueda ayudarte mejor"),

  async execute(interaction: ChatInputCommandInteraction) {
    const historiaExistente = await getStory(interaction.user.id);
    const tieneHistoria = !!historiaExistente;

    const modal = new ModalBuilder()
      .setCustomId("modal_historia")
      .setTitle(tieneHistoria ? "✏️ Actualizar historia" : "💬 Cuéntame tu historia");

    const historiaInput = new TextInputBuilder()
      .setCustomId("input_historia")
      .setLabel(tieneHistoria ? "Actualiza tu situación" : "¿Qué está pasando?")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(
        "Escribe tu situación amorosa aquí. Entre más detalles, mejor consejo puedo darte..."
      )
      .setMinLength(20)
      .setMaxLength(4000)
      .setRequired(true);

    if (tieneHistoria && historiaExistente) {
      historiaInput.setValue(historiaExistente.slice(0, 4000));
    }

    const row =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        historiaInput
      );

    modal.addComponents(row);

    await interaction.showModal(modal);

    try {
      const submitted = await interaction.awaitModalSubmit({
        time: 300_000,
        filter: (i) =>
          i.customId === "modal_historia" && i.user.id === interaction.user.id,
      });

      await submitted.deferReply({ flags: MessageFlags.Ephemeral });

      const historia = submitted.fields.getTextInputValue("input_historia");

      // Guarda la historia (no se toca nada de puntos aquí)
      await saveStory(interaction.user.id, historia);

      await submitted.editReply(
        tieneHistoria
          ? `✅ **Historia actualizada.**\n\nYa tengo tu nuevo contexto. Usa **/ia** para pedir consejo con la información actualizada.`
          : `✅ **Historia guardada.**\n\nYa tengo tu contexto. Cuando quieras un consejo, usa **/ia** y cuéntame qué está pasando ahora.`
      );

      // Calcula puntosMigajero en segundo plano sin bloquear la respuesta
      analizarHistoria(historia)
        .then(async (analisis) => {
          if (!analisis) return;
          await guardarPuntos(
            interaction.user.id,
            interaction.user.username,
            analisis.puntos,
            analisis.nivel,
            analisis.mensaje
          );
        })
        .catch((err) => console.error("Error calculando puntos migajero:", err));

    } catch {
      // El usuario cerró el modal sin enviar (timeout)
    }
  },
} as unknown as BotCommand;
