/**
 * Lista de canciones para el minijuego /adivina
 *
 * Agrega tus canciones aquí. El campo "url" es OPCIONAL.
 * Si no pones URL, el bot busca por título + artista en YouTube automáticamente.
 * Si pones URL y falla (bloqueada), también busca automáticamente como respaldo.
 */
export interface Song {
  title: string;
  artist: string;
  url?: string; // Opcional — si no hay URL, se busca por título+artista
}

export const CANCIONES: Song[] = [
  // ─── Agrega tus canciones aquí ───────────────────────────────────────────
  // { title: "Nombre de la canción", artist: "Artista" },
  // { title: "Nombre de la canción", artist: "Artista", url: "https://youtube.com/..." },
  // ─────────────────────────────────────────────────────────────────────────

  // Ejemplos de placeholder (puedes reemplazar o agregar los tuyos):
  { title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee" },
  { title: "Tití Me Preguntó", artist: "Bad Bunny" },
  { title: "Hawái", artist: "Maluma" },
  { title: "Dákiti", artist: "Bad Bunny & Jhay Cortez" },
  { title: "Un Verano Sin Ti", artist: "Bad Bunny" },
  { title: "Yonaguni", artist: "Bad Bunny" },
  { title: "La Canción", artist: "J Balvin & Bad Bunny" },
  { title: "Otra Noche en Miami", artist: "Bad Bunny" },
  { title: "Pepas", artist: "Farruko" },
  { title: "Efecto", artist: "Bad Bunny" },
];
