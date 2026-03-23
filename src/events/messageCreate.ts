import { Message, TextChannel } from "discord.js";
import { openai } from "../ai/client.js";

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

function buildSystemPrompt(todosLosCanales: string[], canalActual: string): string {
  const lista = todosLosCanales.map(c => `- #${c}`).join("\n");
  return `Eres un bot moderador inteligente del servidor de Discord. Hablás como un amigo latinoamericano: informal, divertido, con jerga coloquial.

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

Vocabulario permitido al corregir:
- "estás perdido/a" / "flasheaste" / "nada que ver" / "re fuera de lugar"
- "bro" / "pana" / "loco" / "compa"

Formato de respuesta:
- Correcto → "OK"
- Incorrecto → una sola línea corta corrigiendo (máx 120 chars)

Nunca respondas largo. Nunca expliques reglas. Solo corrige o responde OK.`;
}

function buildReplyPrompt(botMessage: string, userReply: string): string {
  return `Eres un bot de Discord que habla como un amigo latinoamericano: informal, divertido, con jerga coloquial (bro, pana, loco, etc).

Un usuario te respondió uno de tus mensajes. Debés contestar de forma natural y relevante al contexto.

Tu mensaje anterior fue:
"${botMessage}"

El usuario te respondió:
"${userReply}"

Respondé de forma corta, casual y en el mismo idioma del usuario. Máximo 150 caracteres. Sin listas, sin formalidades.`;
}

export async function onMessageCreate(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;

  const botUser = message.client.user;

  // ── 1. @mención directa al bot ──────────────────────────────────────────
  if (botUser && message.mentions.users.has(botUser.id)) {
    await message.reply({
      content: "que quieres oe",
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ── 2. Respuesta a un mensaje del bot → IA contextual ───────────────────
  if (message.reference?.messageId) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMsg.author.id === botUser?.id) {
        const userText = message.content.trim();
        if (userText && userText.length >= 1) {
          const response = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: buildReplyPrompt(repliedMsg.content, userText),
              },
            ],
            max_tokens: 80,
            temperature: 0.8,
          });

          const respuesta = response.choices[0]?.message?.content?.trim();
          if (respuesta) {
            await message.reply({
              content: respuesta,
              allowedMentions: { repliedUser: false },
            });
          }
        }
        return;
      }
    } catch {
      // Si no se puede obtener el mensaje referenciado, continúa normal
    }
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
