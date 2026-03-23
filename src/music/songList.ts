/**
 * Lista de canciones para el minijuego /adivina
 * Agrega tus canciones aquí con el formato:
 * { title: "Nombre de la canción", artist: "Artista", url: "URL de YouTube" }
 */
export interface Song {
  title: string;
  artist: string;
  url: string;
}

export const CANCIONES: Song[] = [
  // ─── Agrega tus canciones aquí ───────────────────────────────────────────
  // { title: "Nombre", artist: "Artista", url: "https://www.youtube.com/watch?v=..." },
  // { title: "Nombre", artist: "Artista", url: "https://www.youtube.com/watch?v=..." },
  // ─────────────────────────────────────────────────────────────────────────

  // Ejemplos de placeholder (reemplazalos con tus URLs reales):
  { title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", url: "https://www.youtube.com/watch?v=kTJczUoc26U" },
  { title: "Shakira Bzrp Session 53", artist: "Bizarrap & Shakira", url: "https://www.youtube.com/watch?v=4a0Dt4eQ6bY" },
  { title: "Tití Me Preguntó", artist: "Bad Bunny", url: "https://www.youtube.com/watch?v=kQKjSDmVToU" },
  { title: "Hawái", artist: "Maluma", url: "https://www.youtube.com/watch?v=P18GIDJhT2Q" },
  { title: "La Fórmula", artist: "Maluma ft. Marc Anthony", url: "https://www.youtube.com/watch?v=d7LdKDPXBls" },
];
