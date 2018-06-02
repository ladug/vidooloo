const WebSocket = require('ws'),
    Streamer = require('./services/streamers/streamer');

const wss = new WebSocket.Server({ port: 3101 });
console.log('SocketServer listening to localhost:3101');

const wsStreamer = new Streamer(wss);

/*wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        const messageObj = JSON.parse(message);
        console.log('received: %s', message);

        //test object communication
       // messageObj.testProp = 'vidooloo';
       // ws.send(JSON.stringify(messageObj));


        const array = new Uint8Array(5);

        for (var i = 0; i < array.length; ++i) {
            array[i] = i ;
        }

        ws.send(array);

        for (var i = 0; i < array.length; ++i) {
            array[i] = i + 10 ;
        }

        ws.send(array);
    });


});*/


