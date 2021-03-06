const cheerio = require('cheerio')
const request = require('request')
const jsonfile = require('jsonfile')
const sdk = require("matrix-bot-sdk");

const configfile = 'config/config.json'
var config = jsonfile.readFileSync(configfile)

const MatrixClient = sdk.MatrixClient;
const SimpleFsStorageProvider = sdk.SimpleFsStorageProvider;
const AutojoinRoomsMixin = sdk.AutojoinRoomsMixin;

const client = new MatrixClient(config.homeServerUrl, config.accessToken, new SimpleFsStorageProvider(config.storage));

AutojoinRoomsMixin.setupOnClient(client);
client.start().then(() => console.log("LOG: Client started!"));

client.on("room.message", (roomId, event) => {
  if (! config.monitorChannels.includes(roomId)) return
  if (! event["content"]) return;
  const sender = event["sender"];
  const body = event["content"]["body"];
  const type = event["content"]["msgtype"];
  const info = event["content"]["info"]
  const url = event["content"]["url"]

  if(roomId != config.targetRoomId) {
    if(config.relayTypes.includes(type)) {
      client.sendMessage(config.targetRoomId, {
        "sender" : sender,
        "msgtype": type,
        "body": body,
        "info": info,
        "url": url
      });
    }
    if(config.extractYoutubeLinks && type == "m.text") {
      link_matches = body.match(/https?:\/\/[^\ ]*youtu[^\ ]*/g)
      if( link_matches && link_matches.length > 0) {
        msg = link_matches[0]
        if(config.showYoutubeTitle) {
          request(msg, function(err, _res, body) {
            if (err) return console.error(err);
            title = ""
            let $ = cheerio.load(body);
            title = $('title').text();
            if(title != "") {
              msg = `${msg} - ${title}`
            }
            client.sendMessage(config.targetRoomId, {
              "msgtype": "m.text",
              "body": msg,
            });
          })
        } else {
          client.sendMessage(config.targetRoomId, {
            "msgtype": "m.text",
            "body": msg,
          });
        }
      }
    }
  }
});
