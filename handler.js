'use strict';

const request = require('request');
require('dotenv').config();

// GRASP card
const options = {
  host: process.env.SERVER_PATH,
  path: '/cards',
  method: 'POST',
  port: process.env.SERVER_PORT,
  headers: {
    'x-api-key': process.env.SERVER_API_KEY,
    'Content-Type': 'application/json'
  }
};

// GRASP operating regions
const instance_regions = {
  chn: 'chennai',
  jbd: 'jakarta',
  sby: 'surabaya',
  bdg: 'bandung',
  srg: 'semarang'
};

// Welcome message to user (telegram)
const initiate = {
  'en': 'Hi! Saya Bencana Bot! Klik "Laporkan" untuk memilih bencana yang ingin kamu laporkan. Hi! I`m Disaster Bot! Click "Report" to select the disaster you would like to report',
  'id': 'Hi! Saya Bencana Bot! Klik "Laporkan" untuk memilih bencana yang ingin kamu laporkan. Hi! I`m Disaster Bot! Click "Report" to select the disaster you would like to report'
};

const report_text = {
  'en': 'Hi! I’m Disaster Bot! Scroll and select the disaster you would like to report.',
  'id': 'Hai! Saya Bencana Bot. Geser dan pilih bencana yang ingin kamu laporkan.'
}

const disasters = {
  'flood': {
    'en': {
      'title': 'Flood',
      'payload': 'flood'
    },
    'id': {
      'title': 'Banjir',
      'payload': 'banjir'
    }
  },
  'eq': {
    'en': {
      'title': 'Earthquake',
      'payload': 'earthquake'
    },
    'id': {
      'title': 'Gempa',
      'payload': 'gempa'
    }
  },
  'ff': {
    'en': {
      'title': 'Forest Fire',
      'payload': 'fire'
    },
    'id': {
      'title': 'Kebakaran Hutan',
      'payload': 'hutan'
    }
  },
  'hz': {
    'en': {
      'title': 'Haze',
      'payload': 'haze'
    },
    'id': {
      'title': 'Kabut Asap',
      'payload': 'asap'
    }
  },
  'vl': {
    'en': {
      'title': 'Volcano',
      'payload': 'volcano'
    },
    'id': {
      'title': 'Gunung Api',
      'payload': 'api'
    }
  },
  'ew': {
    'en': {
      'title': 'Extreme Wind',
      'payload': 'wind'
    },
    'id': {
      'title': 'Angin Kencang',
      'payload': 'kencang'
    }
  }
}

const start = {
  'en': 'Report',
  'id': 'Laporkan'
}

const submit_button = {
  'en': 'Report flood',
  'id': 'Laporkan banjir',
};

// Replies to user
const replies = {
  'en': 'Hi! Report using this link, thanks.',
  'id': 'Hai! Laporkan menggunakan link ini. Terima kasih.',
};

// Confirmation message to user
const confirmations = {
  'en': "Hi! Thanks for your report. I've put it on the map.",
  'id': 'Hai! Terima kasih atas laporan Anda. Aku sudah menaruhnya di peta.',
};

/*
 * Construct the initial message to be sent to the user
 */
function getInitialMessageText(language, cardId, disasterType) {
  return replies[language] + "\n" + process.env.FRONTEND_CARD_PATH + "/" + cardId + "/" + disasterType;
}

/*
 * Construct the confirmation message to be sent to the user
 */
function getConfirmationMessageText(language, implementationArea, reportId) {
  return confirmations[language] + "\n" + process.env.FRONTEND_MAP_PATH + "/" + instance_regions[implementationArea] + '/' + reportId;
}

/*
 * Get one time card link from the server
 */
function getCardLink(username, network, language, callback) {
  var card_request = {
    "username": username,
    "network": network,
    "language": language
  };

  console.log(options);
  console.log(card_request);
  // Get a card from Cognicity server
  request({
    url: options.host + options.path,
    method: options.method,
    headers: options.headers,
    port: options.port,
    json: true,
    body: card_request
  }, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      callback(null, body.cardId); //Return cardId on success
    }
    else {
      var err = 'Error getting card: ' + JSON.stringify(error) + JSON.stringify(response);
      callback(err, null); // Return error
    }
  });
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 */
function sendFacebookMessage(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {
      access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    },
    method: 'POST',
    json: messageData

  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      }
      else {
        console.log("Successfully called Send API for recipient %s",
          recipientId);
      }
    }
    else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

/*
 * constructs payload for the initial menu based on language
 */
function constructMenuPayload(senderId, language) {
  return {
    recipient: {
      id: senderId
    },
    messaging_type: "RESPONSE",
    message: {
      text: report_text[language],
      quick_replies: [
        {
          "content_type":"text",
          "title": disasters['flood'][language]['title'],
          "payload": disasters['flood'][language]['payload']
        },
        {
          "content_type":"text",
          "title": disasters['eq'][language]['title'],
          "payload": disasters['eq'][language]['payload']
        },
        {
          "content_type":"text",
          "title": disasters['vl'][language]['title'],
          "payload": disasters['vl'][language]['payload']
        },
        {
          "content_type":"text",
          "title": disasters['ew'][language]['title'],
          "payload": disasters['ew'][language]['payload']
        },
        {
          "content_type":"text",
          "title": disasters['ff'][language]['title'],
          "payload": disasters['ff'][language]['payload']
        },
        {
          "content_type":"text",
          "title": disasters['hz'][language]['title'],
          "payload": disasters['hz'][language]['payload']
        }
      ]
    }
  }
}

// Sends the disaster card to the user
function sendDisasterCard(senderId, disasterType, language) {
  getCardLink(senderId.toString(), "facebook", language, function(error, cardId) {
    if (error) {
      console.log(error);
    }
    else {
      var messageText = getInitialMessageText(language, cardId, disasterType);
      const payload = {
        recipient: {
          id: senderId
        },
        message: {
          text: messageText
        }
      };
      sendFacebookMessage(payload);
    }
  });
}

// Webhook handler - This is the method called by Facebook when you verify webhooks for the app
module.exports.facebookWebhook = (event, context, callback) => {
  console.log(JSON.stringify(event));
  if (event.method === 'GET') {
    // Facebook app verification
    if (event.query['hub.verify_token'] === process.env.FACEBOOK_VALIDATION_TOKEN && event.query['hub.challenge']) {
      return callback(null, parseInt(event.query['hub.challenge']));
    }
    else {
      return callback('Invalid token');
    }
  }

  if (event.method === 'POST') {
    event.body.entry.map((entry) => {
      entry.messaging.map((messagingItem) => {
        var payload = {};
        var language = process.env.DEFAULT_LANG;
        if (messagingItem.message && messagingItem.message.text && //Code can be removed after updating Petabencana bot because we want to use only menu based communication
          (messagingItem.message.text.toLowerCase().includes('banjir') || messagingItem.message.text.toLowerCase().includes('gempa') ||
            messagingItem.message.text.toLowerCase().includes('flood') || messagingItem.message.text.toLowerCase().includes('earthquake'))) {
          // Form JSON request body
          language = process.env.DEFAULT_LANG;
          var disasterType = 'flood';

          if (messagingItem.message.text.toLowerCase().includes('gempa') || messagingItem.message.text.toLowerCase().includes('earthquake')) {
            disasterType = 'earthquake';
          }

          if (messagingItem.message.text.toLowerCase().includes('flood') || messagingItem.message.text.toLowerCase().includes('earthquake')) {
            language = 'en';
          }
          sendDisasterCard(messagingItem.sender.id, disasterType, language);
        }
        else if (messagingItem.postback && messagingItem.postback.payload) {
          switch (messagingItem.postback.payload) {
            case "GET_STARTED_PAYLOAD":
              payload = {
                recipient: {
                  id: messagingItem.sender.id
                },
                message: {
                  attachment: {
                    type: "template",
                    payload: {
                      template_type: "button",
                      text: initiate['id'],
                      buttons: [{
                          "type": "postback",
                          "title": start['id'],
                          "payload": "laporkan"
                        },
                        {
                          "type": "postback",
                          "title": start['en'],
                          "payload": "report"
                        }
                      ]
                    }
                  }
                }
              };
              console.log("Responding to GET_STARTED_PAYLOAD with:");
              console.log(payload.message.payload);
              break;
            case 'laporkan':
              language = 'id';
              payload = constructMenuPayload(messagingItem.sender.id, language);
              console.log("Responding to report with:");
              console.log(payload.message.payload);
              break;
            case 'report':
              language = 'en';
              payload = constructMenuPayload(messagingItem.sender.id, language);
              console.log("Responding to report with:");
              console.log(payload.message.payload);
              break; 
            }
          }
          else if (messagingItem.quick_reply && messagingItem.quick_reply.payload) {
            var disasterType = "";
            switch (messagingItem.postback.payload) {
              case 'flood':
                disasterType = 'flood';
                language = 'en'
                break;
              case 'banjir':
                disasterType = 'flood';
                language = 'id'
                break;
              case 'earthquake':
                disasterType = 'earthquake';
                language = 'en'
                break;
              case 'gempa':
                disasterType = 'earthquake';
                language = 'id'
                break;
              case 'fire':
                disasterType = 'fire';
                language = 'en'
                break;
              case 'hutan':
                disasterType = 'fire';
                language = 'id'
                break;
              case 'wind':
                disasterType = 'wind';
                language = 'en'
                break;
              case 'kencang':
                disasterType = 'wind';
                language = 'id'
                break;
              case 'volcano':
                disasterType = 'volcano';
                language = 'en'
                break;
              case 'api':
                disasterType = 'volcano';
                language = 'id'
                break;
              case 'haze':
                disasterType = 'haze';
                language = 'en'
                break;
              case 'asap':
                disasterType = 'haze';
                language = 'id'
                break;
              default:
                break;
            }
            sendDisasterCard(messagingItem.sender.id, disasterType, language);
          }
          sendFacebookMessage(payload);
      });
    });
  }
};

module.exports.facebookReply = (event, context, callback) => {
  //This module listens in to SNS Facebook topic and reads the message published
  var message = JSON.parse(event.Records[0].Sns.Message);
  console.log("Message received from SNS topic: " + message);

  var messageText = getConfirmationMessageText(message.language, message.implementation_area, message.report_id);
  const payload = {
    recipient: {
      id: message.username
    },
    message: {
      text: messageText
    }
  };

  //Call Send API to confirmation message with report link to the user
  sendFacebookMessage(payload);
};
