/* Import modules */
const {
  Client, Intents, Collection, MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu,
} = require('discord.js');
const { readdirSync } = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { join } = require('path');
const { ChalkAdvanced } = require('chalk-advanced');

/* Import modules */
const { staffCommands } = require('../config.json');
const Guild = require('../db/models/guild');

/* Export */
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

  // Listen for slash commands
  client.on('interactionCreate', async (interaction) => {
    Guild.findOne({ id: interaction.guild.id }).then(async (dbGuild) => {
      if (!dbGuild) {
        console.log(0);
        const g = new Guild({
          id: interaction.guild.id,
        });

        g.save();
        dbGuild = g;
      }

      if (!interaction.isCommand()) return;

      const command = client.interactions.get(interaction.commandName);

      if (command) {
        try {
          await command.execute(interaction, client);
        } catch (e) {
          console.error(e);
        }
      }
    });
  });

  // Button listener
  client.on('interactionCreate', async (interaction) => {
    Guild.findOne({ id: interaction.guild.id }).then(async (dbGuild) => {
      if (!dbGuild) return;

      if (interaction.isButton() || interaction.isSelectMenu()) {
        try {
          require(`./handler/${interaction.customId}`)(interaction, client, dbGuild);
        } catch (e) {
          console.error(e);
        }
      } else return;
    });
  });

  client.on('modalSubmit', async (interaction) => {
    try {
      Guild.findOne({ id: interaction.guild.id }).then(async (dbGuild) => {
        if (!dbGuild) return;
        require(`./handler/${interaction.customId}`)(interaction, client, dbGuild);
      });
    } catch (e) {
      console.error(e);
    }
  });

  // Message listener
  client.on('messageCreate', (message) => {
    Guild.findOne({ id: message.guild.id }).then(async (dbGuild) => {
      if (!dbGuild || message.author.bot) return;

      const ticket = dbGuild.tickets[dbGuild.tickets.findIndex((t) => t.channel == message.channel.id)];
      if (ticket) {
        if (ticket.members.findIndex((m) => m.id == message.author.id)) ticket.members.push({ id: message.author.id, name: message.author.tag });
        ticket.messages.push({
          message: message.content, author: message.author.id, name: message.author.tag, timestamp: new Date(),
        });

        Guild.findOneAndUpdate({ id: message.guild.id }, { tickets: dbGuild.tickets }).catch();
      }
    });
  });
};
