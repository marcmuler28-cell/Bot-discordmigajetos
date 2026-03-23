import { Message, TextChannel } from "discord.js";
import { openai } from "../ai/client.js";
import { getStory } from "../ai/stories.js";

const CANALES_IGNORADOS = new Set([
  "bienvenida", "welcome", "bienvenidas", "bienvenidos",
  "reglas", "rules", "normas",
  "anuncios", "announcements", "noticias",
  "bots", "bot-commands", "comandos", "bot",
  "logs", "registro",
  "music", "música", "musica",
  "staff", "moderadores", "admin",
]);

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 4_000;

const JERGA_PERUANA = `
Vocabulario que usás (jerga latinoamericana / peruana):
- oe → amigo, forma de llamar la atención (jerga peruana, como "oye")
- mano → amigo (jerga peruana)
- bro / pana / loco / compa → amigo/a
- calla serrano / calla serrana → respuesta cuando alguien dice algo feo; "serrano" para hombre, "serrana" para mujer
- Christian Domínguez estaría orgulloso de ti → cuando alguien habla de infidelidad o engaños (referencia irónica al cantante infiel)
- laika → mujeriego o infiel
- pasivo / pasiva → gay (variá según el género de la persona)
- te arde → "¿te dolió?", en tono de burla o provocación
- oe rogón → cuando alguien está rogando o insistiendo demasiado
- flasheaste → no entendiste bien la situación
- mal ahí → situación de drama o comportamiento inapropiado
- re turbio / nada que ver → fuera de lugar, comportamiento raro
- te arde → ¿te dolió?, en tono de burla
- naaaa / ntp → para relajar
- xddd / jsjsjs → para reírte o restar tensión
`.trim();

function buildSystemPrompt(todosLosCanales: string[], canalActual: string): string {
  const lista = todosLosCanales.map(c => `- #${c}`).join("\n");
  return `Eres un bot moderador inteligente del servidor de Discord. Hablás como un amigo latinoamericano peruano: informal, divertido, con jerga coloquial.

Tu trabajo es analizar mensajes y decidir si están fuera de tema según el canal donde se envían.

Canales de texto que existen en este servidor:
${lista}

Canal actual del mensaje: #${canalActual}

Reglas:
1. Si el mensaje pertenece al canal actual → responde exactamente: "OK"
2. Si el mensaje NO corresponde al canal actual:
   - Mencioná a qué canal debería ir (solo si existe en la lista de arriba)
   - Tono divertido y con jerga latina, sin insultar
3. Si el canal adecuado no existe en la lista → responde "OK"
4. Si el mensaje es ambiguo o puede ir en el canal actual → responde "OK"

${JERGA_PERUANA}

Formato de respuesta:
- Correcto → "OK"
- Incorrecto → una sola línea corta corrigiendo (máx 120 chars)

Nunca respondas largo. Nunca expliques reglas. Solo corrige o responde OK.`;
}

function buildReplyPrompt(botMessage: string, userReply: string, historia?: string): string {
  const historiaBloque = historia
    ? `\n\nAdemás, esta persona una vez compartió su historia personal:\n"${historia.slice(0, 800)}"\n\nUSÁ esa historia para picarle donde duele si el contexto lo permite. Hacé una broma o comentario que lo toque en algo que él mismo reveló. Que duela un poco pero que sea gracioso, no hiriente de verdad.`
    : "";

  return `Eres un bot de Discord que habla como un amigo latinoamericano peruano: informal, divertido, con personalidad fuerte.

${JERGA_PERUANA}${historiaBloque}

Tu mensaje anterior fue:
"${botMessage}"

El usuario te respondió:
"${userReply}"

Respondé de forma corta, casual y en el mismo idioma del usuario. Máximo 180 caracteres. Sin listas, sin formalidades. Usá la jerga de forma natural. Si tenés historia del usuario, usala con humor y sin pasarte.`;
}

export async function onMessageCreate(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;

  const botUser = message.client.user;

  // ── 1. Respuesta a un mensaje del bot → prioridad más alta ──────────────
  // Debe ir ANTES del check de @mención porque Discord agrega automáticamente
  // una @mención del bot cuando alguien responde uno de sus mensajes.
  if (message.reference?.messageId) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);

      if (repliedMsg.author.id === botUser?.id) {
        const userText = message.content
          .replace(/<@!?\d+>/g, "")
          .trim();

        if (!userText) return;

        const historia = await getStory(message.author.id);

        const response = await openai.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: buildReplyPrompt(repliedMsg.content, userText, historia),
            },
          ],
          max_tokens: 100,
          temperature: 0.85,
        });

        const respuesta = response.choices[0]?.message?.content?.trim();
        if (respuesta) {
          await message.reply({
            content: respuesta,
            allowedMentions: { repliedUser: false },
          });
        }
        return;
      }
    } catch {
      // Si no se puede obtener el mensaje referenciado, continúa
    }
  }

  // ── 2. @mención directa al bot (sin ser reply) ──────────────────────────
  if (botUser && message.mentions.users.has(botUser.id)) {
    await message.reply({
      content: "que quieres oe",
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ── 3. Moderación de canales (lógica existente) ──────────────────────────
  const channel = message.channel as TextChannel;
  const channelName = channel.name?.toLowerCase() ?? "";

  if (CANALES_IGNORADOS.has(channelName)) return;

  const textChannels = message.guild.channels.cache
    .filter(c => c.isTextBased() && !c.isDMBased())
    .map(c => (c as TextChannel).name?.toLowerCase())
    .filter((n): n is string => Boolean(n) && !CANALES_IGNORADOS.has(n));

  if (!textChannels.includes(channelName)) return;
  if (textChannels.length < 2) return;

  const content = message.content.trim();
  if (!content || content.length < 3) return;

  const cooldownKey = `${message.author.id}-${message.channelId}`;
  const now = Date.now();
  const lastUsed = cooldowns.get(cooldownKey) ?? 0;
  if (now - lastUsed < COOLDOWN_MS) return;
  cooldowns.set(cooldownKey, now);

  try {
    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(textChannels, channelName) },
        { role: "user", content: message.content.trim() },
      ],
      max_tokens: 80,
      temperature: 0.6,
    });

    const respuesta = response.choices[0]?.message?.content?.trim();
    if (!respuesta || respuesta.toUpperCase() === "OK") return;

    await message.reply({ content: respuesta, allowedMentions: { repliedUser: false } });
  } catch (err) {
    console.error("Error en moderador de mensajes:", err);
  }
}
