const express = require("express");
const app = express();
const PORT_ROOM = parseInt(process.env.PORT_ROOM || 15001);

app.get("/", (req, res) => res.send("Hello Child!"));
app.listen(PORT_ROOM, () =>
  console.log(`Child listening on port ${PORT_ROOM}!`)
);
