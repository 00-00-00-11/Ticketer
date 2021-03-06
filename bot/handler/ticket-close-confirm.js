/* Import modules */
const {
  MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu,
} = require('discord.js');

/* Import files */
const Guild = require('../../db/models/guild');
const { createTranscript } = require('../../functions/bot');

/* Export */
module.exports = (interaction, client, dbGuild) => {
  const dbTicket = dbGuild.tickets[dbGuild.tickets.findIndex((t) => t.channel == interaction.channel.id)];

  dbTicket.state = 'closed';
  Guild.findOneAndUpdate({ id: interaction.guild.id }, { tickets: dbGuild.tickets }).catch();

  createTranscript(interaction.guild.id, dbTicket);
  const deleteEmbed = new MessageEmbed()
    .setTitle('> Delete Ticket')
    .setDescription('This ticket will be deleted in 10 seconds.')
    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) });

  const transcriptEmbed = new MessageEmbed()
    .setTitle('> Ticket transcript')
    .setDescription('This is the transcript of this ticket.')
    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.avatarURL({ dynamic: true }) });

  const row = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setURL(`https://ticketer.tk/ticket/${interaction.guild.id}/${interaction.channel.id}?password=${String(interaction.guild.id).substring(0, interaction.guild.id.length / 2)}${String(interaction.channel.id).substring(interaction.channel.id.length / 2, interaction.channel.id.length)}`)
        .setLabel('Download')
        .setStyle('LINK'),
    );

  interaction.channel.messages.cache.get(interaction.message.id).delete();
  interaction.channel.send({ embeds: [deleteEmbed], ephemeral: false });
  interaction.channel.send({
    embeds: [transcriptEmbed],
    ephemeral: false,
    components: [row],
  });

  setTimeout(() => {
    interaction.channel.delete();
  }, 10000);
};
