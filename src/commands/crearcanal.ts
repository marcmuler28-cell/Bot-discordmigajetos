import {
  CategoryChannel,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildBasedChannel,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { BotCommand } from "../index.js";
import { openai } from "../ai/client.js";

interface CanalConfig {
  nombre: string;
  tema: string;
  slowmode: number;
  emoji: string;
}

function extraerJSON(texto: string): CanalConfig {
  const cleaned = texto.replace(/```json|```/g, "").trim();

  // Intenta parsear directo
  try {
    return JSON.parse(cleaned) as CanalConfig;
  } catch {
    // Intenta extraer con regex si hay basura alrededor
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as CanalConfig;
    }
  }

  // Fallback con nombre basado en descripción
  throw new Error("No se pudo parsear la respuesta de la IA");
}

async function generarConfigCanal(descripcion: string, tipoStr: string): Promise<CanalConfig> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await openai.chat.completions.create(
      {
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Eres un experto en servidores de Discord. El usuario quiere crear un canal de tipo "${tipoStr}" con esta descripción: "${descripcion}".

Responde SOLO con JSON sin markdown ni explicaciones:
{"nombre":"nombre-en-minusculas-con-guiones","tema":"Descripción corta del canal (máx 100 chars)","slowmode":0,"emoji":"🎯"}

Reglas:
- nombre: solo letras minúsculas, números y guiones, sin espacios ni emojis, máx 100 chars
- slowmode: 0 normal, 5 debate, 10 anuncios
- emoji: un emoji que represente el canal`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }
    );

    clearTimeout(timeout);
    const content = response.choices[0]?.message?.content?.trim() ?? "";
    return extraerJSON(content);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export const crearcanalCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("crearcanal")
    .setDescription("La IA crea un canal automáticamente según tu descripción")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("descripcion")
        .setDescription("¿Qué tipo de canal quieres? Descríbelo.")
        .setRequired(true)
        .setMaxLength(300)
    )
    .addStringOption((option) =>
      option
        .setName("tipo")
        .setDescription("Tipo de canal a crear")
        .setRequired(false)
        .addChoices(
          { name: "💬 Texto", value: "texto" },
          { name: "📢 Anuncios", value: "anuncios" },
          { name: "🔊 Voz", value: "voz" },
          { name: "📋 Foro", value: "foro" }
        )
    )
    .addChannelOption((option) =>
      option
        .setName("junto_a")
        .setDescription("Poner el canal en la misma categoría que este canal existente")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildForum,
          ChannelType.GuildCategory
        )
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("categoria")
        .setDescription("Categoría específica donde crear el canal")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "❌ Necesitas el permiso de **Gestionar Canales** para usar este comando.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const descripcion = interaction.options.getString("descripcion", true);
    const tipoStr = interaction.options.getString("tipo") ?? "texto";
    const categoriaDirecta = interaction.options.getChannel("categoria") as CategoryChannel | null;
    const juntoa = interaction.options.getChannel("junto_a") as GuildBasedChannel | null;

    await interaction.deferReply();

    // Resolver categoría final
    let categoriaFinal: CategoryChannel | null = categoriaDirecta;

    if (!categoriaFinal && juntoa) {
      if (juntoa.type === ChannelType.GuildCategory) {
        categoriaFinal = juntoa as CategoryChannel;
      } else {
        // Tomar la categoría del canal referenciado
        const canalRef = interaction.guild?.channels.cache.get(juntoa.id) as TextChannel | undefined;
        if (canalRef?.parent) {
          categoriaFinal = canalRef.parent;
        }
      }
    }

    // Generar configuración con IA
    let config: CanalConfig;
    try {
      config = await generarConfigCanal(descripcion, tipoStr);
    } catch (err) {
      console.error("Error en IA /crearcanal:", err);
      // Fallback: usar descripción como nombre limpio
      const nombreFallback = descripcion
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 50);
      config = {
        nombre: nombreFallback || "nuevo-canal",
        tema: descripcion.slice(0, 100),
        slowmode: 0,
        emoji: "💬",
      };
    }

    const tipoMap: Record<string, ChannelType> = {
      texto: ChannelType.GuildText,
      anuncios: ChannelType.GuildAnnouncement,
      voz: ChannelType.GuildVoice,
      foro: ChannelType.GuildForum,
    };

    const channelType = tipoMap[tipoStr] ?? ChannelType.GuildText;
    const esTexto = channelType === ChannelType.GuildText || channelType === ChannelType.GuildAnnouncement || channelType === ChannelType.GuildForum;
    const esVoz = channelType === ChannelType.GuildVoice;

    try {
      const nuevoCanal = await interaction.guild?.channels.create({
        name: config.nombre,
        type: channelType,
        topic: esTexto ? config.tema : undefined,
        rateLimitPerUser: channelType === ChannelType.GuildText ? config.slowmode : undefined,
        nsfw: false,
        parent: categoriaFinal?.id ?? undefined,
      });

      if (!nuevoCanal) throw new Error("No se creó el canal");

      const tipoNombre: Record<string, string> = {
        texto: "💬 Texto",
        anuncios: "📢 Anuncios",
        voz: "🔊 Voz",
        foro: "📋 Foro",
      };

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`${config.emoji} ¡Canal creado!`)
        .setDescription(`El canal ${nuevoCanal} fue creado correctamente.`)
        .addFields(
          { name: "📌 Nombre", value: `#${config.nombre}`, inline: true },
          { name: "🗂️ Tipo", value: tipoNombre[tipoStr] ?? "💬 Texto", inline: true },
          { name: "📁 Categoría", value: categoriaFinal?.name ?? "Sin categoría", inline: true },
          ...(esTexto ? [{ name: "💡 Tema", value: config.tema || "Sin tema", inline: false }] : []),
          ...(esTexto && !esVoz ? [{
            name: "⏱️ Slowmode",
            value: config.slowmode > 0 ? `${config.slowmode} segundos` : "Desactivado",
            inline: true,
          }] : []),
          { name: "🛡️ Creado por", value: interaction.user.tag, inline: true }
        )
        .setFooter({ text: "Canal generado por IA • migajeria bot" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Error creando canal:", err);
      await interaction.editReply(
        "❌ No pude crear el canal. Verifica que el bot tenga el permiso **Gestionar Canales** y que el nombre no esté duplicado."
      );
    }
  },
} as unknown as BotCommand;
