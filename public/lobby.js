const express = require("express");
const redbird = require("redbird");
const { fork, exec } = require("child_process");

// env variables
const PORT = parseInt(process.env.PORT || 3000);
const PORT_LISTENER = parseInt(process.env.PORT_LISTENER || 15000);
const DOMAIN = process.env.DOMAIN || "http://localhost";
const PROXY_LOGS = process.env.PROXY_LOGS || false;
const PLAYER_LIMIT = process.env.PLAYER_LIMIT || 10;
const ROOM_LIMIT = process.env.ROOM_LIMIT || 10;
const DISABLE_ASSET_PORT = process.env.DISABLE_ASSET_PORT;

console.log(DOMAIN + " | " + PORT + " | " + PORT_LISTENER);
console.log(PORT_LISTENER);
console.log(DOMAIN);

const proxy = redbird({ port: PORT_LISTENER, bunyan: PROXY_LOGS });
const app = express();

proxy.register(DOMAIN + ":" + PORT, DOMAIN + ":" + PORT_LISTENER);
app.get("/", (request, response) => {
  request.connection.setTimeout(6000);
  return findRoom(response);
});
app.get("/*", (request, response) => {
  const search = request.params[0];
  const path = __dirname + "/" + search;
  response.sendFile(path);
});
app.listen(PORT, () => console.log(`Server listening on ${PORT}!`));

// kill all existing processes
exec("pkill -f server.js");

// setup rooms
const rooms = {};
const roomIds = {};

// find a room
async function findRoom(response) {
  for (let roomId in rooms) {
    const room = rooms[roomId];
    if (room.players < PLAYER_LIMIT) {
      response.redirect("/" + room.roomId);
      return;
    }
  }
  console.log("creating new room");
  const createdRoom = await createRoom();
  if (createdRoom.success) {
    response.redirect("/" + createdRoom.roomId);
  } else {
    response.send(createdRoom.message);
  }
}

// create a room
async function createRoom() {
  const newRoomId = getRoomId();
  if (!newRoomId.success) {
    return newRoomId;
  }

  // start up a new room process
  const { roomId } = newRoomId;
  roomIds[roomId] = true;
  const newPort = String(PORT_LISTENER + roomId);
  const child = fork(__dirname + "/server.js", {
    env: {
      PARENT_PORT: PORT,
      PORT: newPort,
      DOMAIN,
      PLAYER_LIMIT,
      DISABLE_ASSET_PORT
    }
  });

  // promise to receive init message from room
  let waitForRoom = new Promise((resolve, reject) => {
    child.on("message", message => {
      if (message.type === "init") {
        if (message.success) {
          console.log("room created and initialised - " + roomId);
          resolve({ success: true, roomId });
        }
      }
    });
  }).catch(err => {
    console.error(err);
  });

  // promise to time out if room does not respond in time
  let wait;
  let roomTimeout = new Promise((resolve, reject) => {
    wait = setTimeout(() => {
      console.log("room creator timed out");
      resolve({
        success: false,
        message: "There was a problem creating a room. Please try later."
      });
    }, 4000);
  }).catch(err => {
    console.error(err);
  });

  // wait for new process
  let mainResponse;
  await Promise.race([waitForRoom, roomTimeout])
    .then(response => {
      clearTimeout(wait);
      mainResponse = response;
    })
    .catch(err => {
      delete roomIds[roomId];
      mainResponse = {
        success: false,
        message: "There was a problem creating a room. Please try later."
      };
      console.error(err);
    });

  // set the reverse proxy for the new room and record it
  if (mainResponse.success) {
    proxy.register(
      DOMAIN + ":" + PORT + "/" + roomId,
      DOMAIN + ":" + newPort + "/"
    );
    const createdTime = new Date().getTime();
    rooms[roomId] = {
      child,
      port: newPort,
      roomId,
      players: 0,
      createdTime,
      lastCheckedTime: createdTime
    };
    child.on("message", message => {
      if (!rooms[roomId]) {
        child.kill();
      }
      if (message.type === "health") {
        rooms[roomId].lastCheckedTime = new Date().getTime();
      } else if (message.type === "players") {
        console.log("room players count - ", message.count);
        rooms[roomId].players = message.count;
      }
    });
  }
  return mainResponse;
}

// get new room id
function getRoomId() {
  FindingIdLoop: for (let roomId = 1; roomId <= ROOM_LIMIT; roomId++) {
    for (let existingRoomId in roomIds) {
      if (parseInt(existingRoomId) === roomId) {
        continue FindingIdLoop;
      }
    }
    return { success: true, roomId };
  }
  return {
    success: false,
    message: "All rooms are full right now. Please try later."
  };
}

// close room
function closeRoom(roomId) {
  const room = rooms[roomId];
  if (room.child) {
    room.child.kill();
  }
  proxy.unregister(
    DOMAIN + ":" + PORT + "/" + roomId,
    DOMAIN + ":" + room.port + "/"
  );
  delete rooms[roomId];
  delete roomIds[roomId];
}

// health check
setInterval(function() {
  const now = new Date().getTime();
  let emptyRoom = false;
  for (let roomId in rooms) {
    const room = rooms[roomId];

    // if room is over 20 seconds old and has no players
    if (room.players < 1 && now - room.createdTime > 20000) {
      // and is not the only empty room
      if (emptyRoom) {
        console.log("closing empty room - " + roomId);
        closeRoom(roomId);
      } else {
        emptyRoom = true;
      }
    }

    // if process has not checked in for ten seconds
    if (now - room.lastCheckedTime > 10000) {
      console.log("room timed out - " + roomId);
      closeRoom(roomId);
    }
  }
}, 1000);
