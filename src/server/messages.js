/* ========================================================================
    Server
    Socket
 ========================================================================== */

/* Set up messages
    ---------------------------------------- */

room.prototype.init_messages = function() {
  this.message_send_ids = [
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

  this.message_receive_ids = [
    "watcher",
    "send_name",
    "player_input",
    "weapon_selected",
    "respawn",
    "ping"
  ];

  this.message_separator = "|";
};

/* Send messages
      ---------------------------------------- */

room.prototype.message_send = function(client, type, props) {
  var i = this.message_send_ids.indexOf(type);

  // if not a valid message
  if (i === "undefined") {
    return;
  }

  // send message
  var message = props
    ? this.message_separator + props.join(this.message_separator)
    : "";
  message = i + message;

  if (this.lag) {
    setTimeout(function() {
      client.send(message);
    }, this.lag);
  } else {
    client.send(message);
  }
};

/* Receive Messages and Assign Tasks
      ---------------------------------------- */

room.prototype.message_receive = function(client, message) {
  // get type of message from id
  var split = message.split(this.message_separator);
  var id = parseInt(split[0]);

  // if not valid id
  if (!this.message_receive_ids[id]) {
    return;
  }
  var type = this.message_receive_ids[id];
  var event = { type: type, user_id: client.user_id };

  // prepare information for event handler
  if (type === "watcher") {
    event.client = client;
  } else if (type === "send_name") {
    event.client = client;
    event.name = split[1];
  } else if (type === "player_input") {
    event.frame = parseInt(split[1]);
    event.action = split[2];
    event.angle = parseInt(split[3]);
    event.weapon = split[4];
  } else if (type === "weapon_selected") {
    event.weapon = split[1];
  } else if (type === "respawn") {
  } else if (type === "chat") {
    event.message = split[1];
  } else if (type === "ping") {
    this.message_send(client, "ping", [split[1]]);
  }

  // run event
  this.run_event(event);
};

/* Send Message to All Players
      ---------------------------------------- */

room.prototype.message_all_players = function(type, props, omit) {
  for (user_id in this.players) {
    // ignore omitted user id
    if (user_id == omit) {
      continue;
    }

    // send the message
    var client = this.players[user_id];
    this.message_send(client, type, props);
  }
};
