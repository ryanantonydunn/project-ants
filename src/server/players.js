/* ========================================================================
    Server
    Players
 ========================================================================== */

/* Player Joining
    ---------------------------------------- */

room.prototype.player_join = function(event) {
  // get a player id
  var player_id = null;
  for (var i = 0; i < PLAYER_LIMIT; i++) {
    if (!this.player_ids[i]) {
      player_id = i;
      this.player_ids[i] = event.user_id;
      break;
    }
  }
  if (player_id === null) {
    this.message_send(event.client, "full", []);
    return;
  }

  // add to players
  this.player_count++;
  this.players[event.user_id] = event.client;
  event.client.name =
    event.name.length > 20 ? event.name.substring(0, 20) : event.name;
  event.client.player_id = player_id;
  event.client.actions = {};
  event.client.responses = [];
  event.client.state = null;

  // send message to joined player
  this.message_send(event.client, "connected", [
    player_id,
    event.client.name,
    this.get_player_list(),
    SCHEME
  ]);

  // send message to all players
  this.message_all_players(
    "player_join",
    [event.user_id, event.client.name, player_id],
    event.user_id
  );

  // tell server
  sendPlayers();

  // if game is active start new players game
  if (this.status === "active") {
    this.message_send(event.client, "game_start", [
      0,
      this.bg_str,
      this.map.fg.canv.toDataURL(),
      this.gravity_map
    ]);
    this.start_core_player(player_id);
  }

  // if game is waiting for players
  if (this.status === "waiting") {
    this.start_game_try();
  }
};

/* Player Leaving
    ---------------------------------------- */

room.prototype.player_leave = function(client) {
  // if is watcher
  if (this.watchers[client.user_id]) {
    delete this.watchers[client.user_id];
  }

  // if is not a player
  if (!this.players[client.user_id]) {
    return;
  }

  this.player_count--;

  // if no more players then destroy game
  if (this.player_count < 1) {
    // EXTERMINATE
  }

  // send message to all players
  this.message_all_players("player_leave", [client.user_id]);

  if (this.status === "active") {
    this.remove_core_player(client.player_id);

    // if not enough players to play
    if (this.player_count < this.min_players) {
      this.end_game(true);
    }
  }

  // tell server
  sendPlayers();

  // remove from players array
  this.player_ids[client.player_id] = null;
  delete this.players[client.user_id];
};

/* Get player list
    ---------------------------------------- */

room.prototype.get_player_list = function() {
  var players = [];
  for (user_id in this.players) {
    var player = this.players[user_id],
      arr = [user_id, player.name, player.player_id];
    players.push(arr.join("/"));
  }
  return players.join("+");
};

/* Set up a game player in the core
    ---------------------------------------- */

room.prototype.start_core_player = function(player_id, state) {
  this.core.create_player({ id: player_id });
  this.core.create_object({ type: "player", player_id: player_id });
  this.core.init_player(player_id, state);
};

/* Remove a player from core
    ---------------------------------------- */

room.prototype.remove_core_player = function(player_id) {
  this.core.remove_player(player_id);
};
