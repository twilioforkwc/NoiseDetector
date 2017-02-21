'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const basicAuth = require('basic-auth-connect');
const config = require('config');
const twilio = require('twilio');
const AccessToken = require('twilio').jwt.AccessToken;
const SyncGrant = AccessToken.SyncGrant;
const https = require('https');
const fs = require('fs');
const twi = require('./routes/twi');

// Create Express webapp
var app = express();
app.use(express.static(__dirname + '/public'));

app.set('port', (process.env.PORT || 4444));

app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// テスト画面の表示
app.get('/', (request, response) => {
  response.render('pages/index', {
    title: 'NoiseDetector',
    version: config.version
  });
});

// TwilioClinetのケイパビリティトークンを返す
app.get('/token', (request, response) => {
  let results = {};
  twi.getToken(request.query.client, (err, token) => {
    if (err) {
      results = {
        status: 'NG',
        token: null
      };
    } else {
      results = {
        status: 'OK',
        token: token
      };
    }
    response.json(results);
  });
});

// Twilio Syncのトークンを返す
app.get('/tokenSync', (request, response) => {
  let appName = 'NoiseDetector';
  let identity = request.query.userName || 'test';
  let deviceId = request.query.device;

  // Create a unique ID for the client on their current device
  let endpointId = `${appName}:${identity}:${deviceId}`;

  // Create a "grant" which enables a client to use Sync as a given user,
  // on a given device
  let syncGrant = new SyncGrant({
    serviceSid: config.twilio.sync.sid,
    endpointId: endpointId
  });

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  let token = new AccessToken(
    config.twilio.SID,
    config.twilio.sync.apiKey,
    config.twilio.sync.apiSecret
  );
  token.addGrant(syncGrant);
  token.identity = identity;
  console.log('Sync token generated.'+':'+identity);

  // Serialize the token to a JWT string and include it in a JSON response
  response.send({
    identity: identity,
    token: token.toJwt()
  });
});

// 発信を行うTwiMLを返す
app.get('/dial', (request, response) => {
  let number = request.query.number || request.query.To || '';
  twi.dial(number, (err, twiml) => {
    if (err) {
      response.sendStatus(500);
    } else {
      response.type('text/xml');
      response.send(twiml);
    }
  });
});

// ステータスの変化時にTwilioからコールされる
app.all('/statusCallback', basicAuth((user, pass) => {  // BASIC認証
  return user === config.basicAuth.user && pass === config.basicAuth.pass;
}));
app.post('/statusCallback', (request, response) => {
  response.setHeader('Content-Type', 'text/plain');
  twi.statusCallback(request.body, (err) => {
    if (err) {
      response.sendStatus(500);
    } else {
      response.sendStatus(200);
    }
  });
});

/* // HTTPSをNode.jsでやる場合はここのコメントを外します
var options = {
  key: fs.readFileSync('./certs/privkey.pem'),
  cert: fs.readFileSync('./certs/fullchain.pem')
};

var server = https.createServer(options, app).listen(app.get('port'), function(){
  console.log('Node app is running on port', app.get('port'));
});
*/

// HTTPSをnginxに任せる場合は、ここのコメントを外します
var server = app.listen(app.get('port'), () => {
  console.log('Node app is running on port', app.get('port'));
});


// session.ioサーバー起動
// sio(server);
