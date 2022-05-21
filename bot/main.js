/* Import modules */
const { Client, Intents, Collection, MessageEmbed } = require('discord.js');
const { readdirSync } = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { join } = require('path');
const { ChalkAdvanced } = require('chalk-advanced');

/* Import modules */
const { staffCommands } = require('../config.json');

/* Export bot */
module.exports = () => {
  // Create client
  const client = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
    ],
  });

  // Wait for client to connect
  client.on('ready', () => {
    console.log(ChalkAdvanced.bgGreen(ChalkAdvanced.black(' [BOT] Bot is ready ')));
  });

  // Log in into client
  client.login(process.env.TOKEN);

  // Setup Interactions
  client.interactions = new Collection();
  const interactions = [];

  const interactionFiles = readdirSync(join('./bot/interactions')).filter((f) => f.endsWith('.js'));

  interactionFiles.forEach((interactionFile) => {
    const interaction = require(`./interactions/${interactionFile}`);
    client.interactions.set(interaction.data.name, interaction);
    interactions.push(interaction.data.toJSON());
    console.log(ChalkAdvanced.bgBlue(ChalkAdvanced.black(` [BOT] Loaded interaction ${interaction.data.name} `)));
  });

  const restClient = new REST({ version: '9' }).setToken(process.env.TOKEN);

  console.log(ChalkAdvanced.bgGreen(ChalkAdvanced.black(' [BOT] Loaded interactions ')));

  restClient.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEVGUILD_ID), { body: interactions })
    .catch(console.error);

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.interactions.get(interaction.commandName);

    if (command) {
      try {
        await command.execute(interaction, client);
      } catch (e) {
        console.error(e);

        if (interaction.deferred || interaction.replied) {
          interaction.editReply('Error while executing the interaction');
        } else {
          interaction.reply('Error while executing the interaction');
        }
      }
    }
  });
};