import { GuildMember, TextChannel, EmbedBuilder } from "discord.js";

const WELCOME_CHANNELS = [
  "bienvenida", "bienvenidas", "bienvenidos",
  "welcome", "general",
];

export async function onGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const guild = member.guild;

    let welcomeChannel: TextChannel | undefined;

    for (const name of WELCOME_CHANNELS) {
      const found = guild.channels.cache.find(
        (c) => c.isTextBased() && !c.isDMBased() &&
               (c as TextChannel).name?.toLowerCase() === name
      ) as TextChannel | undefined;

      if (found) {
        welcomeChannel = found;
        break;
      }
    }

    if (!welcomeChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("👋 ¡Bienvenido/a al servidor!")
      .setDescription(
        `Hola ${member}! 🎉 Nos alegra tenerte acá.\n\n` +
        `Para acceder a todos los comandos del bot y aparecer en el **ranking**, ` +
        `primero tenés que registrarte:\n\n` +
        `> \`/registrar\`\n\n` +
        `¡Es rápido, pana! Cualquier duda, preguntale a alguien del servidor. 😊`
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: `Usuario nuevo · ID: ${member.user.id}` })
      .setTimestamp();

    await welcomeChannel.send({ content: `${member}`, embeds: [embed] });
  } catch (err) {
    console.error("Error en bienvenida de nuevo miembro:", err);
  }
}

