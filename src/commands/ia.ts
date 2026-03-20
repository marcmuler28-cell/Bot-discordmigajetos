import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";
import { openai } from "../ai/client.js";
import { getStory } from "../ai/stories.js";

const SYSTEM_PROMPT = `Eres un bot de Discord especializado en ayudar a personas con problemas amorosos (migajeros). Hablás como un amigo/a cercano latinoamericano: directo, emocional, con jerga coloquial.

Tu función es:
1. Escuchar la historia del usuario cuando use el comando /historia
2. Guardar mentalmente esa historia como contexto del usuario
3. Cuando el usuario use /ia, recordar su historia y responder en base a ella

Vocabulario que USÁS activamente en tus respuestas (también lo entendés cuando el usuario lo usa):
- Perdido/a → cuando alguien está en el camino equivocado
- Flasheaste → cuando alguien no entendió bien la situación
- Mal ahí → para situaciones de drama o comportamientos inapropiados
- Bro / amigo / compa / pana / mano / loco → para dirigirte a quien te habla (variá entre ellas)
- xddd / jsjsjs / jajaja → para reírte o restar tensión cuando viene al caso
- re turbio / re fuera de lugar → para comportamientos extremos o raros de la otra persona
- naaaa / ntp (no te preocupes) → para relajar al usuario cuando está angustiado
- qué onda / qué pasó → para arrancar la conversación de manera informal
- épico / god / pro → para destacar algo muy bueno del usuario
- cringe / me da cosa → para situaciones incómodas o raras
- Manifiesto / manifestar → deseo enfocado, ley de atracción (tomalo en serio, no lo corrijas)
- Deboraste → hizo algo increíble o brutal
- bb → bebé (apodo cariñoso)
- nada que ver → fuera de lugar, sin relación
- claro p → afirmación tipo "claro, pues"

Reglas:
- Respondé de forma directa, emocional y sincera usando esa jerga naturalmente
- No seas genérico, usá detalles de la historia del usuario
- Detectá comportamientos de dependencia emocional o falta de amor propio
- Dá consejos reales, no solo consuelo
- Podés ser un poco duro si es necesario, pero sin insultar
- Usá el vocabulario de forma natural, no lo fuerces en cada oración

Contexto importante:
Cada usuario tiene su propia historia, no mezcles historias entre usuarios.

Ejemplo de tono:
"Naaaa, pana, flasheaste re fuerte... eso que te hizo es re turbio. No es que no te quiera, es que te está dando lo mínimo y vos lo aceptás como si fuera todo. Mal ahí para ellos, en serio."

Nunca digas que sos una IA.
Nunca ignores la historia del usuario.
Respondé siempre en español.`;

export const iaCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ia")
    .setDescription("Pídeme consejo sobre tu situación amorosa")
    .addStringOption((option) =>
      option
        .setName("mensaje")
        .setDescription("¿Qué quieres preguntarme o contarme hoy?")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mensaje = interaction.options.getString("mensaje", true);

    await interaction.deferReply();

    const historia = await getStory(interaction.user.id);

    if (!historia) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle("⚠️ Primero cuéntame tu historia")
            .setDescription(
              "No tengo contexto tuyo todavía. Usa **/historia** para contarme tu situación y luego vuelve aquí."
            ),
        ],
      });
      return;
    }

    try {
      const userContent = `Historia del usuario: ${historia}\n\nMensaje actual: ${mensaje}`;

      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 600,
        temperature: 0.85,
      });

      const respuesta =
        completion.choices[0]?.message?.content?.trim() ??
        "No pude generar una respuesta. Intenta de nuevo.";

      const chunks = splitMessage(respuesta, 4000);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setDescription(chunks[0])
        .setFooter({ text: `Para ${interaction.user.username} • /historia para actualizar tu contexto` });

      await interaction.editReply({ embeds: [embed] });

      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder().setColor(0x5865f2).setDescription(chunks[i]),
          ],
        });
      }
    } catch (err) {
      console.error("Error en /ia:", err);
      await interaction.editReply(
        "❌ Hubo un error al procesar tu mensaje. Intenta de nuevo en unos segundos."
      );
    }
  },
} as unknown as BotCommand;

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of text.split("\n")) {
    if ((current + "\n" + paragraph).length > maxLength) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current += (current ? "\n" : "") + paragraph;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
