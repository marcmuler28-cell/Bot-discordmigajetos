export interface GameRound {
  songTitle: string;
  songArtist: string;
  url: string;
  textChannelId: string;
  answered: boolean;
}

/**
 * Mapa de juegos activos por guildId.
 * Si un guildId está en este mapa, hay una ronda en curso.
 */
export const activeGames = new Map<string, GameRound>();
