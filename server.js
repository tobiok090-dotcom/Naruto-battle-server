const WebSocket = require('ws');

// Set the port.
const PORT = 8080;

const wss = new WebSocket.Server({ port: PORT });

let hostConnection = null;

console.log(`WebSocket server started on port ${PORT}`);

wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', message => {
    let data;
    try {
      data = JSON.parse(message);
      console.log('Received:', data);
    } catch (e) {
      console.error('Failed to parse message:', message);
      return;
    }

    if (data.type === 'register_player') {
      ws.isPlayer = true;
      ws.playerName = data.name;
      console.log(`Player ${ws.playerName} registered`);
      if (hostConnection) {
        hostConnection.send(JSON.stringify({
          type: 'player_connected',
          name: ws.playerName
        }));
      }
    } else if (data.type === 'register_host') {
      hostConnection = ws;
      ws.isHost = true;
      console.log('Host screen registered');
    } else if (data.type === 'use_ability') {
      if (hostConnection && hostConnection.readyState === WebSocket.OPEN) {
        hostConnection.send(JSON.stringify({
          type: 'ability_request',
          playerName: data.playerName,
          ability: data.ability,
          timestamp: new Date().toISOString()
        }));
        ws.send(JSON.stringify({
          type: 'request_sent',
          status: 'success'
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'request_sent',
          status: 'error',
          message: 'Host not connected. Cannot send request.'
        }));
      }
    }
  });

  ws.on('close', () => {
    if (ws.isHost) {
      console.log('Host disconnected');
      hostConnection = null;
    } else if (ws.isPlayer) {
      console.log(`Player ${ws.playerName || 'unknown'} disconnected`);
      if (hostConnection) {
        hostConnection.send(JSON.stringify({
          type: 'player_disconnected',
          name: ws.playerName
        }));
      }
    } else {
      console.log('Client disconnected');
    }
  });
});

