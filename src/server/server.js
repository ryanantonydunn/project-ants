// env variables
const PARENT_PORT = parseInt(process.env.PARENT_PORT || 3000);
const PORT = parseInt(process.env.PORT || 15000);
const DOMAIN = process.env.DOMAIN || "http://localhost";
const PLAYER_LIMIT = process.env.PLAYER_LIMIT || 1;
const SCHEME = process.env.SCHEME || "deathmatch";
const DISABLE_ASSET_PORT = String(process.env.DISABLE_ASSET_PORT) === "true";
const SINGLE = String(process.env.SINGLE) === "true";
const assetPort = DISABLE_ASSET_PORT ? "" : ":" + PARENT_PORT;
const ASSETS = DOMAIN + assetPort + "/assets";

// imports
var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var canvas = require("canvas");
var deepmerge = require("deepmerge");
var uuid = require("node-uuid");

// start the room
const roomInstance = new room();

// check in with parent process
if (!SINGLE) {
  setInterval(() => {
    if (room) {
      process.send({ type: "health" });
    }
  }, 5000);
}

// update parent process with player count
function sendPlayers() {
  if (!SINGLE) {
    process.send({ type: "players", count: roomInstance.player_count });
  }
}

// request handler
server.listen(PORT);
app.get("/", (request, response) => {
  response.set("Content-Type", "text/html");
  response.send(`
<!doctype html>
<html>
<head>
<meta name="viewport" content="minimal-ui, user-scalable=no, initial-scale=0.7, maximum-scale=0.7, width=device-width">
<meta name="description" content="Hand made browser action game">
<meta property="og:description" content="Hand made browser action game">
<meta name="keywords" content="projectants, ants, game, games, web game, html5, fun, flash">
<meta property="og:type" content="website">
<meta property="og:title" content="Project Ants">
<meta property="og:url" content="http://ryanantonydunn.github.io/project-ants/">
<meta property="og:site_name" content="http://ryanantonydunn.github.io/project-ants/">
<meta property="og:image" content="${ASSETS}/images/fbthumb.jpg">
<link rel="image_src" href="${ASSETS}/images/fbthumb.jpg">
<link rel="icon" href="${ASSETS}/images/favicon.png?v=1">
<link rel="stylesheet" type="text/css" href="${ASSETS}/css/style.css">
</head>
<body>
<script src="${DOMAIN + ":" + PORT}/socket.io/socket.io.js"></script>
<script>const PORT=${PORT};const ASSETS="${ASSETS}";const DOMAIN="${DOMAIN}";</script>
<script src="${ASSETS}/js/app.js"></script>
</body>
</html>
`);
});

app.get("/*", (request, response) => {
  const search = request.params[0];
  const path = __dirname + "/" + search;
  response.sendFile(path);
});

// sockets
io.sockets.on("connection", client => {
  client.user_id = uuid();
  client.on("message", message => {
    if (roomInstance) {
      roomInstance.message_receive(client, message);
    }
  });
  client.on("disconnect", () => {
    if (roomInstance) {
      roomInstance.player_leave(client);
    }
  });
});
io.set("heartbeat timeout", 6000);
io.set("heartbeat interval", 5000);

// inform parent that we have initialised
if (!SINGLE) {
  process.send({ type: "init", success: true });
}
console.log("server instance started", DOMAIN, PORT);
