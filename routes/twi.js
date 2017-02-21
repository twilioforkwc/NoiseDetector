/**
 * Twilio関連
 */
'use strict'
const config = require('config');
const twilioLibrary = require('twilio');
const twilio = new twilioLibrary.Twilio(config.twilio.SID, config.twilio.Token);
const Capability = require('twilio').jwt.Capability;
// socket = require('socket.io-client')(config.hostname);

/**
 * 相手先に発信するTwiMLを返す
 * @param number 電話番号
 * @return err エラーオブジェクト
 * @return TwiML
 **/
exports.dial = (number, callback) => {
  console.log('twi.dial called('+number+')');

  let clientName = null;
  if (isNaN(number)) {
    clientName = number;
  } else {
    number =  (number.substring(0, 1) === '+' ? number : '+81' + number.substring(1));   // 0AB〜Jを+81に変換
  }
  let resp = new twilioLibrary.TwimlResponse();
  resp.dial({
    callerId: config.twilio.From,
  }, function() {
    if (clientName) {
      this.client(clientName, {
        statusCallback: 'https://'+config.basicAuth.user+':'+config.basicAuth.pass+'@'+config.twilio.Server+'/statusCallback',
        statusCallbackMethod: "POST",
        statusCallbackEvent: "completed"
      });
    } else {
      this.number(number, {
        statusCallback: 'https://'+config.basicAuth.user+':'+config.basicAuth.pass+'@'+config.twilio.Server+'/statusCallback',
        statusCallbackMethod: "POST",
        statusCallbackEvent: "completed"
      });
    }
  });
  callback(null, resp.toString());
};

/**
 * 通話を切断する
 * @param  callSid 切断したいCallSid
 * @return err エラーオブジェクト
 */
exports.disconnect = (callSid, callback) => {
  console.log('twi.disconnect called('+callSid+')');

  twilio.calls(callSid).update({
    status: 'completed'
  }, (err, call) => {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
};

/**
 * ステータスに変化があった場合にTwilio側から呼ばれ、ステータスに応じてTwilioToCenterのメッセージを返却する
 * @param  reqBody     twilio側がセットしてきたパラメータ群
 * @return             なし
 */
exports.statusCallback = (reqBody, callback) => {
  console.log('twi.statusCallback called.');

  callback(null);
};

/**
 * ケイパビリティトークンを生成する
 * @param clientName 着信用クライアント名
 * @return {[type]} token 生成されたトークン
 */
exports.getToken = (clientName, callback) => {
  console.log('twi.getToken called('+clientName+')');

  // すでに同じ名前のアプリケーションがある場合は、それらを削除しておく
  twilio.applications.each({ friendlyName: "dial" }, (application, done) => {
    application.delete();
  });
  // Twilioアプリケーションを作成
  twilio.applications.create({
    friendlyName: "dial",
    voiceUrl: config.hostname+"/dial",
    voiceMethod: "GET"
  }, (err, app) => {
    if (err) {
      console.log('Twilioアプリケーションの作成に失敗しました。'+err.message);
      callback(err);
    } else {
      // 発信を許可
      let	capability = new Capability(config.twilio.SID, config.twilio.Token);
    	capability.allowClientOutgoing(app.sid); // 上で作成したアプリケーションのSID
      if (clientName) capability.allowClientIncoming(clientName);   // 着信用クライアント名
      let token = capability.generate();
      console.log('ケイパビリティトークンを生成しました。('+token+')');
    	callback(null, token);  // トークンの有効期間は1時間
    }
  });
};
