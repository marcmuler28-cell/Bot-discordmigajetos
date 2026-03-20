import { Client } from "discord.js";

export function onReady(client: Client<true>) {
  console.log(`✅ Bot conectado como: ${client.user.tag}`);
  console.log(`🤖 Servidores: ${client.guilds.cache.size}`);
  client.user.setActivity("con Discord.js");
}
