import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";

export const infoCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Muestra información detallada del servidor actual"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: "Este comando solo puede usarse dentro de un servidor.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const owner = await guild.fetchOwner().catch(() => null);

    const textChannels = guild.channels.cache.filter((c) => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === 2).size;
    const categories = guild.channels.cache.filter((c) => c.type === 4).size;

    const cachedMembers = guild.members.cache;
    const bots = cachedMembers.filter((m) => m.user.bot).size;
    const humans = cachedMembers.filter((m) => !m.user.bot).size;
    const totalMembers = guild.memberCount;

    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount ?? 0;
    const boostLevelNames = ["Sin nivel", "Nivel 1", "Nivel 2", "Nivel 3"];

    const createdDate = new Date(guild.createdTimestamp);
    const formattedDate = `${String(createdDate.getDate()).padStart(2, "0")}/${String(createdDate.getMonth() + 1).padStart(2, "0")}/${createdDate.getFullYear()}`;

    const emojis = guild.emojis.cache;
    const emojiPreview =
      emojis.size > 0
        ? emojis
            .first(8)
            .map((e) => `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`)
            .join(" ") + (emojis.size > 8 ? ` +${emojis.size - 8} más` : "")
        : "Sin emojis personalizados";

    const rulesChannel = guild.rulesChannel;

    const verificationLevels: Record<number, string> = {
      0: "Ninguna",
      1: "Baja",
      2: "Media",
      3: "Alta",
      4: "Muy Alta",
    };

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
      .addFields(
        {
          name: "👑 Propietario",
          value: owner ? `${owner.user.tag}` : "Desconocido",
          inline: true,
        },
        {
          name: "🆔 ID del servidor",
          value: guild.id,
          inline: true,
        },
        {
          name: "📅 Fecha de creación",
          value: `${formattedDate}\n(<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`,
          inline: true,
        },
        {
          name: "👥 Miembros",
          value: `**Total:** ${totalMembers}\n🧑 Humanos: ~${humans}\n🤖 Bots: ~${bots}`,
          inline: true,
        },
        {
          name: "📁 Canales",
          value: `💬 Texto: ${textChannels}\n🔊 Voz: ${voiceChannels}\n📂 Categorías: ${categories}`,
          inline: true,
        },
        {
          name: "🏷️ Roles",
          value: `${guild.roles.cache.size} roles`,
          inline: true,
        },
        {
          name: "📊 Nivel de boost",
          value: `${boostLevelNames[boostLevel] ?? "Desconocido"}\n🚀 ${boostCount} boost(s)`,
          inline: true,
        },
        {
          name: "🔒 Verificación",
          value: verificationLevels[guild.verificationLevel] ?? "Desconocida",
          inline: true,
        },
        {
          name: "😀 Emojis personalizados",
          value: `**${emojis.size}** emojis\n${emojiPreview}`,
        },
        {
          name: "📋 Canal de reglas",
          value: rulesChannel ? `${rulesChannel}` : "No configurado",
          inline: true,
        }
      )
      .setImage(guild.bannerURL({ size: 1024 }) ?? null)
      .setTimestamp()
      .setFooter({ text: `Servidor creado el ${formattedDate}` });

    if (guild.description) {
      embed.setDescription(guild.description);
    }

    await interaction.editReply({ embeds: [embed] });
  },
} as unknown as BotCommand;
