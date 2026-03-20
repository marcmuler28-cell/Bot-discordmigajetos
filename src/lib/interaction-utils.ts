import { ChatInputCommandInteraction } from "discord.js";

const TIMEOUT_MS = 10_000;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = TIMEOUT_MS
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

export async function safeReply(
  interaction: ChatInputCommandInteraction,
  content: string
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content, embeds: [] });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  } catch {
    // La interacción ya expiró, no hay nada que hacer
  }
}
