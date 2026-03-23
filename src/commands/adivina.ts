import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { BotCommand } from "../index.js";
import { manager } from "../music/manager.js";
import { CANCIONES } from "../music/songList.js";
import { activeGames } from "../music/gameState.js";
import { sumarPuntosJuego } from "../db/puntosJuego.js";

const DURACION_CLIP_MS = 10_000;   // 10 segundos de audio
const DURACION_GUESS_MS = 60_000;  // 1 minuto para adivinar
const PUNTOS_ACIERTO = 10;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizar(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function esCorrecta(respuesta: string, titulo: string): boolean {
  const normResp = normalizar(respuesta);
  const normTitulo = normalizar(titulo);
  if (normResp.length < 3) return false;
  return (
    normResp.includes(normTitulo) ||
    (normTitulo.includes(normResp) && normResp.length >= normTitulo.length * 0.6)
  );
}

export const adivinaCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("adivina")
    .setDescription("🎵 ¡Adivina la canción! Se reproducen 10 segundos y tienes 1 minuto para responder"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    // Verificar que no haya un juego activo
    if (activeGames.has(interaction.guildId)) {
      await interaction.reply({
        content: "⚠️ Ya hay un juego activo en este servidor. Espera a que termine.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Verificar canal de voz
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) {
      await interaction.reply({
        content: "❌ Debes estar en un canal de voz para iniciar el juego.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Elegir canción aleatoria
    if (CANCIONES.length === 0) {
      await interaction.reply({
        content: "❌ No hay canciones en la lista todavía.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const cancion = CANCIONES[Math.floor(Math.random() * CANCIONES.length)];
    const textChannel = interaction.channel as TextChannel;

    await interaction.reply(
      "🎵 **¡Comienza el juego!** Escucha bien... el primero que escriba el nombre de la canción gana **10 puntos** 🏆"
    );

    // Registrar el juego activo ANTES de reproducir
    activeGames.set(interaction.guildId, {
      songTitle: cancion.title,
      songArtist: cancion.artist,
      url: cancion.url,
      textChannelId: interaction.channelId,
      answered: false,
    });

    try {
      let player = manager.getPlayer(interaction.guildId);
      if (!player) {
        player = manager.createPlayer({
          guildId: interaction.guildId,
          voiceChannelId: voiceChannel.id,
          textChannelId: interaction.channelId,
          selfDeaf: true,
          selfMute: false,
          volume: 70,
        });
      } else {
        player.voiceChannelId = voiceChannel.id;
        player.textChannelId = interaction.channelId;
      }

      if (!player.connected) {
        await player.connect();
        await sleep(1000);
      }

      const result = await player.search({ query: cancion.url }, interaction.user);
      if (!result || result.loadType === "error" || result.loadType === "empty" || !result.tracks.length) {
        await textChannel.send("❌ No pude cargar la canción. Intenta de nuevo.");
        activeGames.delete(interaction.guildId);
        return;
      }

      // Limpiar cola y reproducir
      player.queue.tracks.splice(0);
      player.queue.add(result.tracks[0]);
      await player.play({ paused: false });

      await textChannel.send(
        `🎧 **¡Escucha!** Tienes **1 minuto** para escribir el nombre de la canción en este canal.\n_Tip: no tienes que escribir exactamente, con aproximarte basta._`
      );

      // Detener reproducción después del clip
      const clipTimer = setTimeout(async () => {
        const game = activeGames.get(interaction.guildId!);
        if (game && !game.answered) {
          try {
            await player!.stopPlaying(true, true);
            await textChannel.send("⏱️ ¡Se acabó el clip! Todavía tienes tiempo de escribir...");
          } catch {
            // silencioso
          }
        }
      }, DURACION_CLIP_MS);

      // Collector de mensajes para detectar respuestas
      const collector = textChannel.createMessageCollector({
        time: DURACION_GUESS_MS,
        filter: (msg) => !msg.author.bot,
      });

      collector.on("collect", async (msg) => {
        const game = activeGames.get(interaction.guildId!);
        if (!game || game.answered) return;

        if (esCorrecta(msg.content, game.songTitle)) {
          game.answered = true;
          clearTimeout(clipTimer);
          collector.stop("winner");

          const totalPuntos = await sumarPuntosJuego(
            msg.author.id,
            msg.author.username,
            PUNTOS_ACIERTO
          );

          await textChannel.send(
            `🏆 **¡${msg.author.displayName} adivinó!**\n` +
            `🎵 La canción era: **${cancion.title}** — *${cancion.artist}*\n` +
            `🌟 +${PUNTOS_ACIERTO} puntos | Total acumulado: **${totalPuntos} pts**`
          );

          activeGames.delete(interaction.guildId!);
          try { await player!.stopPlaying(true, true); } catch {}
        }
      });

      collector.on("end", async (_collected, reason) => {
        if (reason === "winner") return;

        const game = activeGames.get(interaction.guildId!);
        if (game && !game.answered) {
          clearTimeout(clipTimer);
          await textChannel.send(
            `⏰ **¡Tiempo!** Nadie adivinó.\n` +
            `🎵 La canción era: **${cancion.title}** — *${cancion.artist}*\n` +
            `Usa \`/adivina\` para otra ronda 🎮`
          );
          activeGames.delete(interaction.guildId!);
          try { await player!.stopPlaying(true, true); } catch {}
        }
      });

    } catch (err) {
      console.error("Error en /adivina:", err);
      activeGames.delete(interaction.guildId);
      await textChannel.send("❌ Ocurrió un error al iniciar el juego. Intenta de nuevo.");
    }
  },
} as unknown as BotCommand;
