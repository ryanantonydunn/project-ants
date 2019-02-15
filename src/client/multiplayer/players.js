/* ========================================================================
    Room Players
 ========================================================================== */

/* Create player objects
    ---------------------------------------- */

multiplayer.prototype.init_player = function(props) {
  // add player to array
  this.player_count++;
  this.players[props.user_id] = {
    name: props.name,
    id: props.player_id
  };

  // set players reference
  this.players_ref[props.player_id] = {
    user_id: props.user_id,
    name: props.name,
    level: 0
  };
};

/* Draw players interface
    ---------------------------------------- */

multiplayer.prototype.players_interface = function() {
  // are we good and active
  if (!this.initialised || !this.game.core.state.players) {
    return;
  }

  // show players
  var str = "";
  var sortable = this.players_sort();
  if (!sortable) {
    return;
  }

  // set leader id
  this.game.leader = parseInt(sortable[0].id);

  str = "<thead><th></th><th>lvl</th><th>score</th></thead>";
  for (var i = 0; i < sortable.length; i++) {
    var player = sortable[i];
    var tr_class = "";
    if (player.id == this.player_id) {
      tr_class += "highlight ";
    }
    if (player.dead) {
      tr_class += "dead ";
    }
    str +=
      "<tr class='" +
      tr_class +
      "''><td>" +
      player.name +
      "</td><td class='red'>" +
      (player.level + 1) +
      "</td><td class='green'>" +
      player.score +
      "</td></tr>";
  }

  // check for level ups
  for (var id in this.players_ref) {
    var player = this.players_ref[id];
    var core_player = this.game.core.state.players[id];
    if (!core_player) {
      continue;
    }
    if (player.level !== core_player.level) {
      this.run_event({
        type: "player_level",
        id: parseInt(id),
        prev: player.level,
        new: core_player.level
      });
      this.players_ref[id].level = core_player.level;
    }
  }

  // set content
  this.table_players.innerHTML = str;
};

/* Sort players by score
    ---------------------------------------- */

multiplayer.prototype.players_sort = function() {
  var sortable = [];
  for (var id in this.players_ref) {
    var core_player = this.game.core.state.players[id];
    if (!core_player) {
      continue;
    }
    sortable.push({
      id: id,
      name: this.players_ref[id].name,
      level: core_player.level,
      score: core_player.score,
      dead: core_player.dead
    });
  }
  sortable.sort(function(a, b) {
    return b.score - a.score;
  });
  return sortable;
};

/* Player has joined
    ---------------------------------------- */

multiplayer.prototype.player_join = function(event) {
  this.init_player(event, true);
  this.audio.play("join", 1);
};

/* Player left
    ---------------------------------------- */

multiplayer.prototype.player_leave = function(event) {
  if (!this.players[event.user_id]) {
    return;
  }

  var id = this.players[event.user_id].player_id;
  delete this.players_ref[id];
  delete this.players[event.user_id];
  this.player_count--;

  // remove from game
  if (this.game && this.game.core) {
    this.game.core.remove_player(id);
  }
};
