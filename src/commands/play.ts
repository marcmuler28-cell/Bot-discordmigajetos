import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
} from "discord.js";
import { BotCommand } from "../index.js";
import { manager } from "../music/manager.js";
import { formatDuration } from "../music/manager.js";

function isSoundCloudUrl(query: string): boolean {
  return (
    query.startsWith("https://soundcloud.com/") ||
    query.startsWith("https://on.soundcloud.com/") ||
    query.startsWith("http://soundcloud.com/") ||
    query.startsWith("http://on.soundcloud.com/")
  );
}

export const playCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Busca una canción en SoundCloud y elige cuál reproducir")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Nombre de la canción o artista (o URL de SoundCloud)")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: "❌ Tenés que estar en un canal de voz para usar este comando.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const query = interaction.options.getString("query", true);
    await interaction.deferReply();

    try {
      let player = manager.getPlayer(interaction.guildId);

      if (!player) {
        player = manager.createPlayer({
          guildId: interaction.guildId,
          voiceChannelId: voiceChannel.id,
          textChannelId: interaction.channelId,
          selfDeaf: true,
          selfMute: false,
          volume: 80,
        });
      }

      if (!player.connected) {
        await player.connect();
      }

      // Si es URL directa, intentar cargar sin búsqueda
      const searchPayload = isSoundCloudUrl(query)
        ? { query }
        : { query, source: "scsearch" };

      const result = await player.search(searchPayload, interaction.user);

      if (!result || result.loadType === "error" || result.loadType === "empty" || result.tracks.length === 0) {
        await interaction.editReply(
          "❌ No encontré nada en SoundCloud. Probá con otro nombre, pana."
        );
        return;
      }

      // Si es URL directa o playlist, reproducir directo
      if (isSoundCloudUrl(query) || result.loadType === "track") {
        const track = result.tracks[0];
        player.queue.add(track);
        if (!player.playing && !player.paused) {
          await player.play({ paused: false });
          await interaction.editReply(
            `🎵 Reproduciendo: **${track.info.title}** — ${track.info.author}`
          );
        } else {
          await interaction.editReply(
            `➕ Añadido a la cola: **${track.info.title}** — ${track.info.author}`
          );
        }
        return;
      }

      if (result.loadType === "playlist") {
        player.queue.add(result.tracks);
        if (!player.playing && !player.paused) await player.play({ paused: false });
        await interaction.editReply(
          `✅ Playlist **${result.playlist?.title || "sin título"}** añadida con **${result.tracks.length}** canciones.`
        );
        return;
      }

      // Búsqueda por nombre → mostrar hasta 5 resultados para elegir
      const top5 = result.tracks.slice(0, 5);

      const options = top5.map((track, i) => ({
        label: track.info.title.slice(0, 100),
        description: `${track.info.author} • ${track.info.isStream ? "En vivo" : formatDuration(track.info.duration)}`.slice(0, 100),
        value: String(i),
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("play-select")
        .setPlaceholder("Elegí una canción...")
        .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setColor(0xff5500)
        .setTitle("🎵 Resultados en SoundCloud")
        .setDescription(
          top5.map((t, i) =>
            `**${i + 1}.** ${t.info.title} — *${t.info.author}* [${t.info.isStream ? "🔴 En vivo" : formatDuration(t.info.duration)}]`
          ).join("\n")
        )
        .setFooter({ text: "Tenés 30 segundos para elegir" });

      const reply = await interaction.editReply({ embeds: [embed], components: [row] });

      // Esperar que el usuario elija
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: (i) => i.customId === "play-select" && i.user.id === interaction.user.id,
        time: 30_000,
        max: 1,
      });

      collector.on("collect", async (selectInteraction: StringSelectMenuInteraction) => {
        const idx = Number(selectInteraction.values[0]);
        const chosen = top5[idx];

        player!.queue.add(chosen);

        if (!player!.playing && !player!.paused) {
          await player!.play({ paused: false });
          await selectInteraction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xff5500)
                .setDescription(`🎵 Reproduciendo: **${chosen.info.title}** — ${chosen.info.author}`),
            ],
            components: [],
          });
        } else {
          await selectInteraction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xff5500)
                .setDescription(`➕ Añadido a la cola: **${chosen.info.title}** — ${chosen.info.author}`),
            ],
            components: [],
          });
        }
      });

      collector.on("end", async (collected) => {
        if (collected.size === 0) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x888888)
                .setDescription("⏱️ Se acabó el tiempo. Usá /play de nuevo cuando quieras, pana."),
            ],
            components: [],
          });
        }
      });

    } catch (error) {
      console.error("Error en /play:", error);
      await interaction.editReply(
        "❌ Ocurrió un error. Asegurate de que Lavalink esté activo e intentá de nuevo."
      );
    }
  },
} as unknown as BotCommand;
