'use strict'

let _token = null;  // ケイパビリティトークン
let _client = null; // クライアント名
let _connection = null; // コネクション
let _accessManager; // Manages the state of our access token we got from the server
let _syncClient;  // Our interface to the Sync service
let _syncDoc; // Syncドキュメント

/*
// socket.io接続
var socket = io.connect();

// 接続時
socket.on('connect', function() {});

// 切断時
socket.on('disconnect', function(client) {});

// センターからの受信
socket.on('CenterToUser', function(data) {
  // メッセージの受信
  if (data.type === 'info') {
    // メッセージを表示
    $("#message").html(data.values.message);
  }
});
*/

// Clinetケイパビリティトークンを取得
function getClientToken() {
  const params = {
    client: _client
  };
  $.ajax({
    type: "GET",
    url: "token",
    data: params,
    timeout: 20000,
    success: results => {
      if (results.status === 'NG') {
        alert('ケイパビリティトークンの取得に失敗しました。');
        return false;
      } else {
        _token = results.token;  // ケイパビリティトークンを保存
        Twilio.Device.setup(_token, {
          debug: true,  // デバッグモードON
          region: "jp1",  // リージョンを日本に固定
          audioConstraints: { // オーディオ調整機能ON
            optional: [
              { googAutoGainControl: true },
              { googEchoCancellation: true },
              { googNoiseSuppression: true },
              { googHighPassFilter: true }
            ]
          }
        });  // TwilioDeviceのセットアップ
      }
    },
    error: err => {
      alert('エラーが発生しました'+err);
      return false;
    }
  });

};

// デバイスIDを生成
function getDeviceId() {
  return 'browser-' +
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
       var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
       return v.toString(16);
     });
}

// Twilio Syncトークンを取得
function getSyncToken() {
  const params = {
    client: _client,
    deviceId: getDeviceId()
  };
  $.ajax({
    type: "GET",
    url: "tokenSync",
    data: params,
    timeout: 20000,
    success: tokenResponse => {
      _accessManager = new Twilio.AccessManager(tokenResponse.token);
      _syncClient = new Twilio.Sync.Client(_accessManager);
      _syncClient.document('SyncData').then(function(doc) {
        //Lets store it in our global variable
        _syncDoc = doc;

        //Let's subscribe to changes on this document, so when something
        //changes on this document, we can trigger our UI to update
        _syncDoc.on('updated', getSyncData);

      });
    },
    error: err => {
      alert('エラーが発生しました'+err);
      return false;
    }
  });

};

// Sync通知を受け取った
function getSyncData(data) {
  console.log(data);
};

// ログインボタンを押した
function btn_login_click() {
  myNavigator.pushPage('main.html', {
    animation: 'slide',
    onTransitionEnd: function() {
      btn_connect.setDisabled(true);      // 発信ボタンを無効にする
      btn_disconnect.setDisabled(true);   // 切断ボタンを有効にする
      _client = $("#client").val();
      $("#clientName").html(_client);
      // Clientケイパビリティトークンを取得
      getClientToken();
      // Syncトークンを取得
      getSyncToken(_client);
    }
  });
}

// 発信/応答ボタンを押した
function btn_connect_click() {
  btn_connect.setDisabled(true);      // 発信ボタンを無効にする
  btn_disconnect.setDisabled(false);  // 切断ボタンを有効にする
  if ($("#btn_connect").text().trim() === '発信') {  // 発信
    Twilio.Device.connect({
      number: $("#callTo").val()
    });
  } else {  // 着信
    if (_connection.status()=="pending") {
      _connection.accept();  // 接続許可
    }
  }
}

// 切断ボタンを押した
function btn_disconnect_click() {
  // 切断
  Twilio.Device.disconnectAll();
  btn_connect.setDisabled(false);     // 発信ボタンを有効にする
  btn_disconnect.setDisabled(true);   // 切断ボタンを無効にする
}

// テンキーボタンを押した
function btn_tenkey_click(value) {
  if (_connection) {
    _connection.sendDigits(value);
  } else {
    var val = $('#callTo').val()+value;
    $('#callTo').val(val);
  }
}

ons.bootstrap();
ons.ready(function() {
  /* TwilioDevice関連イベント */
  Twilio.Device.ready(function (device) { // 準備完了
    $("#message").html('準備完了');
    btn_connect.setDisabled(false);     // 発信ボタンを有効にする
    btn_disconnect.setDisabled(true);   // 切断ボタンを無効にする
  });

  Twilio.Device.error(function (error) {  // エラー発生
    $("#message").html("Error: " + error.message);
  });

  Twilio.Device.offline(function (device) { // 接続断（ケイパビリティトークン無効）
    getClientToken(); // 再度Clientトークンを取得
  });

  Twilio.Device.connect(function (conn) { // 接続完了
    _connection = conn;
    $("#message").html('接続しました');

    // Call Quality Event
    conn.on('warning', function(name) {
      switch(name) {
        case 'low-mos':
          $("#led_mos").removeClass('led_off');
          $("#led_mos").addClass('led_on');
          break;
        case 'high-jitter':
          $("#led_jit").removeClass('led_off');
          $("#led_jit").addClass('led_on');
          break;
        case 'high-rtt':
          $("#led_rtt").removeClass('led_off');
          $("#led_rtt").addClass('led_on');
          break;
        case 'high-packet-loss':
          $("#led_loss").removeClass('led_off');
          $("#led_loss").addClass('led_on');
          break;
        case 'constant-audio-input-level':
          $("#led_inlvl").removeClass('led_off');
          $("#led_inlvl").addClass('led_on');
          break;

      }
    });
    conn.on('warning-cleared', function(name) {
      switch(name) {
        case 'low-mos':
          $("#led_mos").removeClass('led_on');
          $("#led_mos").addClass('led_off');
          break;
        case 'high-jitter':
          $("#led_jit").removeClass('led_on');
          $("#led_jit").addClass('led_off');
          break;
        case 'high-rtt':
          $("#led_rtt").removeClass('led_on');
          $("#led_rtt").addClass('led_off');
          break;
        case 'high-packet-loss':
          $("#led_loss").removeClass('led_on');
          $("#led_loss").addClass('led_off');
          break;
        case 'constant-audio-input-level':
          $("#led_inlvl").removeClass('led_on');
          $("#led_inlvl").addClass('led_off');
          break;

      }
    });

  });

  // 回線切断
  Twilio.Device.disconnect(function (conn) {
    _connection = null;
    $("#message").html('通話が終了しました');
    $("#btn_connect").text('発信'); // 応答ボタンを有効にする
    btn_connect.setDisabled(false);     // 発信ボタンを有効にする
    btn_disconnect.setDisabled(true);   // 切断ボタンを無効にする
  });

  // 着信
  Twilio.Device.incoming(function (conn) {
    _connection = conn;
    $("#message").html(conn.parameters.From + "から着信中です");   // 発信者を表示
    $("#btn_connect").text('応答'); // 応答ボタンを有効にする
  });

//  btn_connect.setDisabled(true);      // 発信ボタンを無効にする
//  btn_disconnect.setDisabled(true);   // 切断ボタンを無効にする

});
