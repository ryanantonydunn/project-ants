/* ========================================================================
    Multiplayer
    Events
 ========================================================================== */

/* Run events
    ---------------------------------------- */

multiplayer.prototype.run_event = function(event) {
  if (!event) {
    return;
  }

  // handle arrays of events
  if (Array.isArray(event)) {
    for (var i = 0; i < event.length; i++) {
      this.run_event(event[i]);
    }
    return;
  }

  // run events
  if (event.type === "full") {
    this.game_full();
  } else if (event.type === "connected") {
    this.connected(event);
  } else if (event.type === "wait_for_connection") {
    this.wait_for_connection();
  } else if (event.type === "player_join") {
    this.player_join(event);
  } else if (event.type === "player_leave") {
    this.player_leave(event);
  } else if (event.type === "game_wait") {
  } else if (event.type === "game_start") {
    this.game_start(event);
  } else if (event.type === "game_end") {
    this.game_end(event);
  } else if (event.type === "game_state") {
    this.game_state_received(event);
  } else if (event.type === "collect") {
    this.event_collect(event);
  } else if (event.type === "ground_damage") {
    this.event_ground_damage(event);
  } else if (event.type === "player_death") {
    this.event_player_death(event);
  } else if (event.type === "weapon_selected") {
    this.sockets.message_send("weapon_selected", [event.weapon]);
  } else if (event.type === "ping") {
    this.event_ping(event);
  }

  // send event down a level
  else if (this.game) {
    this.game.run_event(event);
  }
};

/* Collected item
    ---------------------------------------- */

multiplayer.prototype.event_collect = function(event) {
  if (this.initialised) {
    // wait to recreate
    this.wait_to_create[event.obj] = this.game.core.state.frame;

    // run client collection events
    this.game.run_event(event);

    // run players interface
    this.players_interface();
  }
};

/* Player death
    ---------------------------------------- */

multiplayer.prototype.event_player_death = function(event) {
  // only use server events
  if (!event.from_server) {
    return;
  }

  // run it
  if (this.initialised) {
    this.player_death(event);
  }
};

/* Ping
    ---------------------------------------- */

multiplayer.prototype.event_ping = function(event) {
  // did we request this
  if (!this.pings[event.frame]) {
    return;
  }

  var now = new Date().getTime();

  // record end time for ping
  this.pings[event.frame].end = now;

  // go through all pings
  var ping_count = 0;
  var ping_total = 0;
  for (var frame in this.pings) {
    var ping = this.pings[frame];

    // remove old ones
    if (ping.end && ping.end + 10000 < now) {
      delete this.pings[frame];
      continue;
    }

    // calculate average
    ping_total += ping.end - ping.start;
    ping_count++;
  }

  // show ping
  this.div_ping.innerHTML = round(ping_total / ping_count);
};
