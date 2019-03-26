const PORT = parseInt(process.env.PORT || 3000);
const PORT_LISTENER = parseInt(process.env.PORT_LISTENER || 15000);
const ROOM_ID = parseInt(process.env.ROOM_ID || 1);
const PORT_ROOM = PORT_LISTENER + ROOM_ID;
const DOMAIN = process.env.DOMAIN || "http://localhost";

const express = require("express");
const proxy = require("redbird")({ port: PORT_LISTENER, bunyan: null });
const { fork } = require("child_process");
const app = express();

proxy.register(DOMAIN + ":" + PORT, DOMAIN + ":" + PORT_LISTENER);
proxy.register(
  DOMAIN + ":" + PORT + "/" + ROOM_ID + "/",
  DOMAIN + ":" + PORT_ROOM
);
app.get("/", (req, res) => res.send("Hello World!"));
app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

fork(__dirname + "/child.js", { env: { PORT_ROOM: PORT_ROOM } });
