const express = require('express');
const request = require('request');
const child_process = require('child_process');
const WebSocket  = require('ws');
const https = require('https');
const http = require('http');
const cors = require('cors');
const util = require('util');
const fs = require('fs');
const serveIndex = require('serve-index');
const io = require('socket.io-client');
const signaling_backend = process.env.SIGNALING_SERVER || 'cluecon-webrtc.tk';
var socket = io.connect('https://' + signaling_backend);
const exec = util.promisify(child_process.exec);

// const app = express();

const room_name = process.env.ROOM_NAME || 'agonza1';
// const privateKey = fs.readFileSync( './cert/key.pem' ).toString();
// const certificate = fs.readFileSync( './cert/server.crt' ).toString();
var token;

// var options = {key: privateKey, cert: certificate};
// app.use(cors());
// app.use(express.static('public'));
// app.use('/', serveIndex('public'));

// create the server
// const server = https.createServer(options, app);
// const wsServer = new WebSocket.Server({server});
// // WebSocket rpi local server
// wsServer.on('connection', function(request) {
//   var connection = request.accept(null, request.origin);
//   console.log('new WS request');
//   connection.on('message', function(message) {
//     if (message) {
//       console.log('received: %s', message);
//       var msg = JSON.parse(message);
//       switch (msg.action) {
//         case 'picamera-up':
//           console.log('picamera up! Turning OFF v4l2');
//           off_camera_driver();
//           break;
//         case 'picamera-down':
//           console.log('picamera down! Turning ON v4l2');
//           // By just reloading chromium we can achieve that
//           if (myCall.getCallProcess())
//             myCall.endCall(myCall.getCallProcess());
//           myCall.startCall();
//           break;
//         default:
//           console.log('Unrecognized action: ' + msg.action);
//       }
//     }
//   });
//   connection.on('close', function(connection) {
//     console.log('closed WS connection');
//   });
// });
//
// var port_https = process.env.RPI_SERVER_PORT_HTTPS || 1337;
// var port_http = process.env.RPI_SERVER_PORT_HTTP || 1336;
// server.listen(port_https, function listening() {
//   console.log('RPI HTTPS server listening on %d', server.address().port);
// });
// http.createServer(app).listen(port_http, function listening() {
//   console.log('RPI HTTP server listening on %d', port_http);
// });

async function off_camera_driver() {
  const { stdout, stderr } = await exec("kill $(lsof /dev/video0  | awk '{print $2}')");
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
}

class Call {
  constructor(id, room, status, process) {
    this.id = id;
    this.room = room;
    this.status = status;
    this.process = process;
    this.changeStatus = function (status) {
      this.status = status;
    }
  }

  getCallProcess(){
    if (!this.process)
      return false;
    return this.process;
  }

  startCall(token) {
    var that = this;
    console.log('Token: ' + token);
    console.log('Room: ' + this.room );
    that.changeStatus('started');
    var args = [
      // '--allow-running-insecure-content',
      // '--ignore-urlfetcher-cert-requests',
      '--allow-insecure-localhost',
      '--disable-gpu',
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',
      'https://'+ signaling_backend + ':8443/broadcast.html'
    ];
    var env = Object.assign({}, process.env);
    var chrome = child_process.spawn('chromium-browser', args, {
      env: env
    });
    this.process = chrome;
    chrome.stdout.on('data', function(data) {
      console.log('Chrome.Out: ' + data);
    });

    chrome.stderr.on('data', function(data) {
      console.log('Chrome.Err: ' + data);
    });

  }

  endCall(process) {
    console.log('kill process');
    process.stdin.pause();
    process.kill();
    this.changeStatus('ended');
  }
}

var deviceId = process.env.DEVICE_ID || 'rpi-test';
var myCall = new Call(deviceId, room_name, 'generated');
myCall.startCall();
console.log('Connecting to', signaling_backend);

socket.on('connect', function(){
  console.log('Connected');
  socket.emit('rpi-connect', deviceId, room_name, (res, err) => {
    if (err || !res)
      throw Error('Error Connecting', err);
    console.log(deviceId + ' connection success!');
  });
  socket.on('webrtc-streaming-action', function(message){
    handleServerMessage(message);
  });
});

socket.on('disconnect', function(){
  console.log('disconnected');
});

function handleServerMessage(msg) {
  console.log('Signaling Server Message: ',msg);
  try {
    var receivedToken = msg.token;
    var id = msg.id;
    if (!receivedToken || deviceId !== id)
      throw Error('Authentication Error. Wrong id or token');

    switch (msg.action) {
      case 'picamera-up':
        console.log('picamera up! Turning OFF v4l2');
        off_camera_driver();
        break;
      case 'picamera-down':
        console.log('picamera down! Turning ON v4l2');
        // By just reloading chromium we can achieve that
        if (myCall.getCallProcess())
          myCall.endCall(myCall.getCallProcess());
        myCall.startCall();
        break;
      case 'start':
        socket.emit('rpi-connect', deviceId, room_name, (res, err) => {
          if (err || !res)
            throw Error('Error Connecting', err);
          console.log(deviceId + ' connection success!');
          console.log('Token OK. Room created successfully. Starting call...');
          myCall.startCall(receivedToken);
        });
        break;
      case 'stop':
        console.log('stopping...');
        //FIXME stop process needs to clear browser too
        if (myCall.getCallProcess())
          myCall.endCall(myCall.getCallProcess());
        break;
      case 'transfer-video':
        console.log('Send to client video:');
        console.log(msg.fileName);
        socket.to(room_name).emit('file-name', {token: token, fileName: msg.fileName});
        break;
      default:
        console.log('Unrecognized action: ' + msg.action);
    }

  } catch (e) {
    console.error(e);
  }
}
