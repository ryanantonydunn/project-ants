/* ========================================================================
    Socket Messages
    handle connection and message data to and from the server
 ========================================================================== */

function SocketConnection(callback) {
  var self = this;

  // socket connection
  if (!io.on) {
    return;
  }
  this.io = io(DOMAIN + ":" + PORT);
  this.io.on("message", function(message) {
    self.message_receive(message);
  });
  this.io.on("disconnect", function() {
    callback({ type: "wait_for_connection" });
  });

  this.callback = callback;

  // ids
  this.message_receive_ids = [
    "full",
    "connected",
    "player_join",
    "player_leave",
    "game_wait",
    "game_start",
    "game_end",
    "game_state",
    "ping"
  ];

  this.message_send_ids = [
    "watcher",
    "send_name",
    "player_input",
    "weapon_selected",
    "respawn",
    "ping"
  ];

  // string separator
  this.message_separator = "|";
}

/* Send messages to server
	---------------------------------------- */

SocketConnection.prototype.message_send = function(type, props) {
  var i = this.message_send_ids.indexOf(type);

  // if not a valid message
  if (i === "undefined") {
    return;
  }

  // send message
  var self = this;
  var message = i + this.message_separator + props.join(this.message_separator);
  if (this.lag) {
    setTimeout(function() {
      self.io.send(message);
    }, this.lag);
  } else {
    this.io.send(message);
  }
};

/* Receive messages from server
	---------------------------------------- */

SocketConnection.prototype.message_receive = function(message) {
  // get type of message from id
  var split = message.split(this.message_separator);
  var id = parseInt(split[0]);

  // if not valid id
  if (!this.message_receive_ids[id]) {
    return;
  }
  var type = this.message_receive_ids[id];
  var event = { type: type };

  // prepare information for event handler
  if (type === "full") {
  } else if (type === "connected") {
    event.player_id = split[1] === "null" ? null : parseInt(split[1]);
    event.name = split[2];
    event.players = split[3];
    event.scheme = split[4];
  } else if (type === "player_join") {
    event.user_id = split[1];
    event.name = split[2];
    event.player_id = parseInt(split[3]);
  } else if (type === "player_leave") {
    event.user_id = split[1];
  } else if (type === "game_wait") {
  } else if (type === "game_start") {
    event.reset_players = parseInt(split[1]);
    event.bg_str = split[2];
    event.fg_str = split[3];
    event.gravity_map = split[4];
  } else if (type === "game_end") {
  } else if (type === "game_state") {
    event.frames = parseInt(split[1]);
    event.state = split[2];
    event.responses = split[3];
    event.damages = split[4];
  } else if (type === "ping") {
    event.frame = parseInt(split[1]);
  }

  // run event
  this.callback(event);
};
