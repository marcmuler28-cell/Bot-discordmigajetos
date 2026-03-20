import { Message } from "discord.js";
import { openai } from "../ai/client.js";

const SYSTEM_PROMPT = `Eres un bot moderador inteligente del servidor de Discord. Hablás como un amigo latinoamericano: informal, divertido, con jerga coloquial.

Tu trabajo es analizar mensajes y decidir si están fuera de tema según el canal donde se envían.

Canales del servidor:
- "general": conversaciones normales
- "chisme": rumores, historias, drama, relaciones
- "left4dead2": todo lo relacionado con Left 4 Dead 2
- "roblox": todo lo relacionado con Roblox

Reglas:

1. Si el mensaje coincide con el tema del canal → responde exactamente: "OK"

2. Si el mensaje NO corresponde al canal:
- Indicá a qué canal debería ir
- Usá un tono divertido y con jerga latina
- No insultes

Vocabulario que PODÉS usar cuando corregís:
- Perdido/a → cuando alguien está en canal equivocado (ej: "estás perdido/a, eso va en #chisme")
- Flasheaste → cuando no entendió el tema del canal
- Bro / pana / loco / compa → para dirigirte a quien escribe
- nada que ver → para decir que el mensaje no corresponde al canal
- re fuera de lugar → para mensajes muy off-topic

3. Detectá intención, no solo palabras:
- Amor, ex, relaciones, drama → "chisme"
- Left4Dead, zombies, jugar L4D2 → "left4dead2"
- Roblox, juegos de Roblox → "roblox"
- Conversación normal → "general"

Formato de respuesta:
- Correcto: "OK"
- Incorrecto: mensaje corto corrigiendo (máx 1 línea)

Ejemplos:
Canal: general | Mensaje: "mi ex me volvió a escribir" → "💔 Eso es chisme, pana… estás perdido, eso va en #chisme 😏"
Canal: chisme | Mensaje: "vamos a jugar Roblox" → "🎮 Flasheaste loco, eso va en #roblox 😏"
Canal: roblox | Mensaje: "vamos a jugar Left 4 Dead 2" → "💀 Nada que ver bro, eso va en #left4dead2"
Canal: left4dead2 | Mensaje: "hoy tuve un chisme con mi ex" → "💘 Re fuera de lugar compa, vete a #chisme 😂"

Nunca ignores el canal. Nunca respondas largo. Nunca expliques reglas. Solo corrige o responde OK.`;

const CANALES_MONITOREADOS = new Set([
  "general",
  "chisme",
  "chismes",
  "left4dead2",
  "left4dead-2",
  "left 4 dead 2",
  "roblox",
]);

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 4_000;

export async function onMessageCreate(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;

  const channelName = (message.channel as { name?: string }).name?.toLowerCase() ?? "";

  if (!CANALES_MONITOREADOS.has(channelName)) return;

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
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Canal: ${channelName}\nMensaje: ${content}`,
        },
      ],
      max_tokens: 80,
      temperature: 0.6,
    });

    const respuesta = response.choices[0]?.message?.content?.trim();

    if (!respuesta || respuesta === "OK") return;

    await message.reply({ content: respuesta, allowedMentions: { repliedUser: false } });
  } catch (err) {
    console.error("Error en moderador de mensajes:", err);
  }
}
