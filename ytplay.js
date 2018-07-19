var Discord = require('discord.js');
var logger = require('winston');
var ytdl = require('ytdl-core');
var auth = require('./auth.json');
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client();
var servers = {}; //we might try to run it on multiple servers

function play(connection, message) {//add a song to the list, and play the next at the end
    var server = servers[message.guild.id];//geting the current server
	//downloading the song from youtube, and streaming it live in the channel
	try{
		server.dispatcher = connection.playStream(ytdl(server.queue[0], {filter: "audioonly"}));
	}
	catch(e){
		connection.disconnect();
	}
	server.isPlaying = true;//we might try to avoid playing multiple times on a server
    server.queue.shift();//preparing the next item
    server.dispatcher.on("end", function(){//at the end, call this again
        if(server.queue[0])//onlu if there is another song
			play(connection, message);
        else{//else, just disconnect from the vocal
			server.isPlaying = false;
			connection.disconnect();
		}
    });
};

/* Bot stuff, creating ready event*/
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.user.username + ' - (' + bot.user.id + ')');
});


bot.on('message', function (message) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `µ`
    var prefix = "µ";
    if(message.author.id == bot.user.id)
        return;
    if (message.content.substring(0, 1) == prefix) {
     
        var args = message.content.substring(prefix.length).split(' ');
        var cmd = args[0];
        args = args.splice(1);
        switch(cmd) {
            case 'play':
				const channel = message.member.voiceChannel;
				if(!channel)
					return;
				if(!servers[message.guild.id]){
					servers[message.guild.id] = bot.guilds.get(message.guild.id);
					servers[message.guild.id]["queue"] = new Array();
					servers[message.guild.id]["dispatcher"] = null;
					servers[message.guild.id]["isPlaying"] = null;
				}
				song = message.content.substring(1).split(' ')[1];
				if(!song)
					return;
				servers[message.guild.id].queue.push(song);
				if(!servers[message.guild.id].isPlaying){
					channel.join()
						.then(function(connection){
							play(connection, message);
						})
						.catch(console.error);
				}
            break;
			case 'pause':
			    var server = servers[message.guild.id];
				if(server && server.dispatcher){
					server.dispatcher.pause();
				}
			break;
			case 'resume':
			    var server = servers[message.guild.id];
				if(server && server.dispatcher){
					server.dispatcher.resume();
				}
			break;
			case 'next':
				var server = servers[message.guild.id];
				if(server && server.dispatcher){
					// server.queue.shift();
					server.dispatcher.end();
				}
			break;
			case 'stop':
				var server = servers[message.guild.id];
				if(server && server.dispatcher){
					server.queue = new Array();
					server.dispatcher.end();
				}
			break;
         }
     }
});

bot.login(auth.token);
