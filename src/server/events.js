/* ========================================================================
    Server
    Events
 ========================================================================== */

/* Run Events
    ---------------------------------------- */

room.prototype.run_event = function(event) {
  if (!event) {
    return;
  }

  // handle array of events
  if (Array.isArray(event)) {
    for (var i = 0; i < event.length; i++) {
      this.run_event(event[i]);
    }
    return;
  }

  // run events
  if (event.type === "watcher") {
    this.watcher(event);
  } else if (event.type === "send_name") {
    this.player_join(event);
  } else if (event.type === "player_input") {
    this.player_input(event);
  } else if (event.type === "weapon_selected") {
    this.player_weapon_selected(event);
  } else if (event.type === "respawn") {
    this.respawn_player(event);
  } else if (event.type === "ground_damage") {
    this.ground_damage(event);
  } else if (event.type === "player_leave") {
    this.event_player_leave(event);
  }
};

/* Set up watcher
    ---------------------------------------- */

room.prototype.watcher = function(event) {
  // are there too many
  if (this.watchers > 4) {
    this.message_send(event.client, "full", []);
  }

  // add to watchers
  this.watcher_count++;
  this.watchers[event.client.user_id] = event.client;

  // send details
  this.message_send(event.client, "connected", [
    "null",
    "",
    this.get_player_list()
  ]);

  // if game is active start new players game
  if (this.status === "active") {
    this.message_send(event.client, "game_start", [
      0,
      this.bg_str,
      this.map.fg.canv.toDataURL(),
      this.gravity_map
    ]);
  }
};

/* Received player input
    ---------------------------------------- */

room.prototype.player_input = function(event) {
  // if game does not have an active game
  if (this.status !== "active") {
    return;
  }

  // store input
  var player = this.players[event.user_id];
  player.actions[event.frame] = event;
};

/* Player weapon selected
    ---------------------------------------- */

room.prototype.player_weapon_selected = function(event) {
  // if game does not have an active game
  if (this.status !== "active") {
    return;
  }

  var player = this.players[event.user_id];
  if (!player) {
    return;
  }

  var core_player = this.core.state.players[player.player_id];
  if (!core_player) {
    return;
  }

  // reset game state to stored data
  core_player.weapon = event.weapon;
};

/* Respawn player
    ---------------------------------------- */

room.prototype.respawn_player = function(event) {
  // if game does not have an active game
  if (this.status !== "active") {
    return;
  }

  var player = this.players[event.user_id];
  if (!player) {
    return;
  }

  var player_id = this.players[event.user_id].player_id;
  var core_player = this.core.state.players[player_id];
  if (!core_player || !core_player.dead) {
    return;
  }

  // reset scores
  this.core.init_player(player_id);
};

/* Ground damage
    ---------------------------------------- */

room.prototype.ground_damage = function(event) {
  var key = event.frame + "-" + event.x + "-" + event.y + "-" + event.radius;
  if (this.damaged_ground_all[key]) {
    if (this.damaged_ground_all[key] >= event.radius) {
      return;
    }
  }

  // set core map
  this.core.map.set_circle(event.x, event.y, event.radius, 0);

  // recalculate gravity
  // this.core.map.gravity_event_recalculate(event.x, event.y, event.radius);

  // draw to map
  this.map.fg.cont.beginPath();
  this.map.fg.cont.arc(event.x, event.y, event.radius, 0, 2 * Math.PI);
  this.map.fg.cont.fill();

  // store it for sending
  this.damaged_ground_send[key] = duplicate_obj(event);

  // store it to prevent duplicates
  this.damaged_ground_all[key] = event.radius;
};

/* Player leave
    ---------------------------------------- */

room.prototype.event_player_leave = function(event) {
  this.core.remove_player(event.player_id);
};
