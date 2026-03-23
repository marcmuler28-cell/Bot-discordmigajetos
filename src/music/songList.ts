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
  { title: "Shake It Off", artist: "Taylor Swift", url: "https://youtu.be/nfWlot6h_JM?si=ZtNQt8LxL9uAiNRg" },
  { title: "Esta Noche", artist: "Orquesta Candela", url: "https://youtu.be/X_EXBsQDBs4?si=QklHi3JS-raQqVEG" },
  { title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", url: "https://youtu.be/kJQP7kiw5Fk?si=n8piMzaDq7tLypwE" },
  { title: "GANGNAM STYLE", artist: "PSY", url: "https://youtu.be/9bZkp7q19f0?si=BIGJrI7fHEGBkTQ-" },
  //{ title: "Tití Me Preguntó", artist: "Bad Bunny", url: "https://www.youtube.com/watch?v=kQKjSDmVToU" },
  //{ title: "Hawái", artist: "Maluma", url: "https://www.youtube.com/watch?v=P18GIDJhT2Q" },
  //{ title: "La Fórmula", artist: "Maluma ft. Marc Anthony", url: "https://www.youtube.com/watch?v=d7LdKDPXBls" },
];
