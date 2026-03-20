import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "../index.js";

interface MemeApiResponse {
  postLink: string;
  subreddit: string;
  title: string;
  url: string;
  nsfw: boolean;
  spoiler: boolean;
  author: string;
  ups: number;
  preview: string[];
}

export const memeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Trae un meme aleatorio de Reddit")
    .addStringOption((option) =>
      option
        .setName("subreddit")
        .setDescription("Subreddit de donde traer el meme")
        .setRequired(false)
        .addChoices(
          { name: "r/memes", value: "memes" },
          { name: "r/dankmemes", value: "dankmemes" },
          { name: "r/me_irl", value: "me_irl" },
          { name: "r/funny", value: "funny" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const chosenSub = interaction.options.getString("subreddit") ?? "memes";

    try {
      const response = await fetch(`https://meme-api.com/gimme/${chosenSub}`, {
        headers: { "User-Agent": "DiscordBot/1.0" },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const meme = (await response.json()) as MemeApiResponse;

      if (meme.nsfw || meme.spoiler) {
        await interaction.editReply(
          "⚠️ El meme obtenido es NSFW o tiene spoiler. Intenta de nuevo."
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle(
          meme.title.length > 256
            ? meme.title.slice(0, 253) + "..."
            : meme.title
        )
        .setURL(meme.postLink)
        .setImage(meme.url)
        .setFooter({
          text: `r/${meme.subreddit} • 👍 ${meme.ups.toLocaleString()} • u/${meme.author}`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(
        "❌ No se pudo obtener el meme. Intenta de nuevo en unos segundos."
      );
    }
  },
} as unknown as BotCommand;
