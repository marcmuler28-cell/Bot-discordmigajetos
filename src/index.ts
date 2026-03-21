import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
  REST,
  Routes,
} from "discord.js";
import { keepAlive } from "./keep_alive.js";
import { pingCommand } from "./commands/ping.js";
import { helpCommand } from "./commands/help.js";
import { infoCommand } from "./commands/info.js";
import { kickCommand } from "./commands/kick.js";
import { banCommand } from "./commands/ban.js";
import { clearCommand } from "./commands/clear.js";
import { memeCommand } from "./commands/meme.js";
import { historiaCommand } from "./commands/historia.js";
import { iaCommand } from "./commands/ia.js";
import { bromaCommand } from "./commands/broma.js";
import { crearcanalCommand } from "./commands/crearcanal.js";
import { registrarCommand } from "./commands/registrar.js";
import { actualizarCommand } from "./commands/actualizar.js";
import { perfilCommand } from "./commands/perfil.js";
import { rankingCommand } from "./commands/ranking.js";
import { ttsCommand } from "./commands/tts.js";
import { onReady } from "./events/ready.js";
import { onMessageCreate } from "./events/messageCreate.js";
import { onGuildMemberAdd } from "./events/guildMemberAdd.js";
import { safeReply } from "./lib/interaction-utils.js";
// ── Música ──────────────────────────────────────────────────────────────────
import { playCommand } from "./commands/play.js";
import { skipCommand } from "./commands/skip.js";
import { stopCommand } from "./commands/stop.js";
import { pauseCommand } from "./commands/pause.js";
import { resumeCommand } from "./commands/resume.js";
import { queueCommand } from "./commands/queue.js";
import { nowplayingCommand } from "./commands/nowplaying.js";
import { volumenCommand } from "./commands/volumen.js";
import { initLavalink, manager } from "./music/manager.js";

export interface BotCommand {
  data: {
    name: string;
    description: string;
    toJSON(): unknown;
  };
  execute(interaction: Interaction): Promise<void>;
}

const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error("DISCORD_TOKEN environment variable is required.");
}

keepAlive();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

const commands = new Collection<string, BotCommand>();

const allCommands: BotCommand[] = [
  pingCommand,
  helpCommand,
  infoCommand,
  kickCommand,
  banCommand,
  clearCommand,
  memeCommand,
  historiaCommand,
  iaCommand,
  bromaCommand,
  crearcanalCommand,
  registrarCommand,
  actualizarCommand,
  perfilCommand,
  rankingCommand,
  ttsCommand,
  // Música
  playCommand,
  skipCommand,
  stopCommand,
  pauseCommand,
  resumeCommand,
  queueCommand,
  nowplayingCommand,
  volumenCommand,
];

for (const command of allCommands) {
  commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (readyClient) => {
  onReady(readyClient);
  registerSlashCommands(readyClient.user.id, token!);
  initLavalink(readyClient);
});

// Reenviar eventos raw a Lavalink (necesario para voice state updates)
client.on("raw", (d) => {
  manager?.sendRawData(d).catch(() => {});
});

client.on(Events.MessageCreate, onMessageCreate);
client.on(Events.GuildMemberAdd, onGuildMemberAdd);

client.on(Events.MessageCreate, onMessageCreate);

const COMMAND_TIMEOUT_MS = 25_000;

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`Comando no encontrado: ${interaction.commandName}`);
    await safeReply(
      interaction,
      "❌ Comando no reconocido. Usa `/help` para ver los comandos disponibles."
    );
    return;
  }

  let timedOut = false;
  const timeoutId = setTimeout(async () => {
    timedOut = true;
    console.warn(`⏱️ Timeout en comando /${interaction.commandName}`);
    await safeReply(
      interaction,
      `⏱️ El comando \`/${interaction.commandName}\` tardó demasiado en responder. Por favor intenta de nuevo.`
    );
  }, COMMAND_TIMEOUT_MS);

  try {
    await command.execute(interaction);
  } catch (error) {
    if (timedOut) return;
    const isTimeout = error instanceof Error && error.message === "TIMEOUT";
    console.error(`Error en /${interaction.commandName}:`, error);
    await safeReply(
      interaction,
      isTimeout
        ? `⏱️ El comando \`/${interaction.commandName}\` tardó demasiado. Intenta de nuevo.`
        : `❌ Ocurrió un error al ejecutar \`/${interaction.commandName}\`. Intenta de nuevo en unos segundos.`
    );
  } finally {
    clearTimeout(timeoutId);
  }
});

async function registerSlashCommands(clientId: string, token: string) {
  const rest = new REST().setToken(token);
  const commandData = allCommands.map((c) => c.data.toJSON());

  try {
    console.log("Registrando comandos de barra diagonal...");
    await rest.put(Routes.applicationCommands(clientId), {
      body: commandData,
    });
    console.log(`✅ ${commandData.length} comandos registrados correctamente.`);
  } catch (error) {
    console.error("Error registrando comandos:", error);
  }
}

client.on("error", (error) => {
  console.error("❌ Error del cliente Discord:", error);
});

client.on("disconnect", () => {
  console.warn("⚠️ Bot desconectado de Discord");
});

client.on("shardDisconnect", (event, shardId) => {
  console.warn(`⚠️ Shard ${shardId} desconectado. Código: ${event.code}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

client.login(token).catch((err) => {
  console.error("❌ Error al iniciar sesión en Discord:", err);
  process.exit(1);
});

