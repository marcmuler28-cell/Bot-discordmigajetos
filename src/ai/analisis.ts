import { openai } from "./client.js";

export interface AnalisisMigajero {
  puntos: number;
  nivel: "leve" | "medio" | "crítico";
  mensaje: string;
}

// Analiza una historia amorosa con IA y devuelve los puntosMigajero
export async function analizarHistoria(historia: string): Promise<AnalisisMigajero | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un juez humorístico del sufrimiento amoroso. Analizas historias de "migajeros" (personas que reciben migajas de amor) y asignás puntos según el nivel de sufrimiento.

Devuelve SOLO un JSON válido sin markdown:
{"puntos":<número 0-1000>,"nivel":"<leve|medio|crítico>","mensaje":"<frase graciosa máx 80 chars>"}

Criterios de puntuación:
- Rechazo directo: +50 a +150 puntos
- Visto/ignorado sin respuesta: +80 puntos
- Insistencia del usuario: +100 puntos
- Ser bloqueado: +200 puntos
- Humillación emocional: +150 puntos
- Sufrimiento romántico general: +50 a +100 puntos

Niveles:
- leve: 0-299 puntos
- medio: 300-599 puntos
- crítico: 600+ puntos 💀

El mensaje debe ser gracioso y usar jerga latina cuando quede natural. Podés usar palabras como: "pana", "bro", "flasheaste", "mal ahí", "re turbio", "naaaa", "cringe", etc.
Respondé siempre en español.`,
        },
        { role: "user", content: historia },
      ],
      max_tokens: 150,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = content.replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const result = JSON.parse(match[0]) as AnalisisMigajero;
    // Asegurar que el nivel sea válido
    if (!["leve", "medio", "crítico"].includes(result.nivel)) result.nivel = "leve";
    result.puntos = Math.max(0, Math.min(1000, Math.round(result.puntos)));
    return result;
  } catch (err) {
    console.error("Error analizando historia con IA:", err);
    return null;
  }
}
