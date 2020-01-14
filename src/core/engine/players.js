/* ========================================================================
    Players
 ========================================================================== */

/* Create a new player
	---------------------------------------- */

core.prototype.create_player = function(props, state) {
  if (typeof props.id === "undefined") {
    return;
  }

  var state_ref = state || this.state;

  // set up object
  var obj = {
    id: "",
    level: 0,
    score: 0,
    dead: false,
    health: this.scheme.levels.health[0],
    cooldown: 0,
    hit: 0,
    weapon: "",
    locked: "",
    events: [],
    armoury: {}
  };
  obj = deepmerge(obj, props);
  obj.id = parseInt(obj.id);

  // set level
  this.player_level(obj.id);

  // add to state objects
  state_ref.players[obj.id] = obj;

  return obj;
};

/* Remove player
	---------------------------------------- */

core.prototype.remove_player = function(player_id) {
  if (!this.state.players[player_id]) {
    return;
  }

  delete this.state.objects["player-" + player_id];
  delete this.state.players[player_id];
};

/* Start the player
	---------------------------------------- */

core.prototype.init_player = function(player_id, state) {
  player_id = parseInt(player_id);
  var player = this.state.players[player_id];
  if (!player) {
    return;
  }

  // player values
  player.level = 0;
  player.score = 0;
  player.dead = false;
  player.health = this.scheme.levels.health[0];
  player.cooldown = 0;
  player.events = [];

  // armoury
  var armoury = {};
  for (var key in this.scheme.weapons) {
    armoury[key] = this.scheme.weapons[key].start_count;
  }
  player.armoury = armoury;

  // merge with an external state
  if (state) {
    this.state.players[player_id] = deepmerge(player, state);
  }

  // set level
  this.player_level(player_id);

  // object values
  var obj = this.state.objects["player-" + player_id];
  if (!obj) {
    return;
  }
  if (this.scheme.spawn.length > 0) {
    var pos = this.scheme.spawn[rand(0, this.scheme.spawn.length)];
  } else {
    var pos = this.map.next_to_land();
  }
  obj.type = "player";
  obj.grounded = false;
  obj.x = pos.x;
  obj.y = pos.y;
  obj.speed_x = 0;
  obj.speed_y = 0;
  obj.c = this.c.objects["player"];
};

/* Update armoury
	---------------------------------------- */

core.prototype.update_player_armoury = function(player_id, weapon, count) {
  var player = this.state.players[player_id];
  if (!player) {
    return;
  }

  // if infinite or if zero and taking away
  var old_count = player.armoury[weapon];
  if (!is_numeric(old_count)) {
    return false;
  }
  if (old_count === -1) {
    return true;
  }
  if (old_count === 0 && count < 1) {
    return false;
  }

  // if infinite
  if (count === "infinite") {
    player.armoury[weapon] = -1;
  } else {
    player.armoury[weapon] += count;
  }

  // record event
  this.state.events.push({
    type: "armoury",
    player_id: player_id,
    weapon: weapon
  });

  return true;
};

/* Add health to player
	---------------------------------------- */

core.prototype.player_health_add = function(player_id, health, no_message) {
  var player = this.state.players[player_id];
  if (!player || player.dead) {
    return;
  }

  // no health enabled
  if (!this.scheme.health) {
    return;
  }

  // add it
  player.health += health;
  player.health = min(player.health, this.scheme.levels.health[player.level]);

  // are we dead
  if (player.health <= 0) {
    this.player_die(player_id);
  }

  // set event
  if (!no_message) {
    this.state.events.push({
      type: "player_health",
      id: player_id,
      health: health
    });
  }
};

/* Add score to player
	---------------------------------------- */

core.prototype.player_score_add = function(player_id, score) {
  var player = this.state.players[player_id];
  if (!player || player.dead) {
    return;
  }

  // add it
  player.score += score;

  // set level
  this.player_level(player_id);

  // set event
  this.state.events.push({
    type: "player_score",
    id: player_id,
    score: score
  });
};

/* Set player level
	---------------------------------------- */

core.prototype.player_level = function(player_id) {
  var player = this.state.players[player_id];
  if (!player || player.dead) {
    return;
  }

  // go through levels
  var level = 0;
  for (var i = 0; i < this.scheme.levels.score.length; i++) {
    if (this.scheme.levels.score[i] <= player.score) {
      level = i;
    }
  }
  player.level = level;
};

/* Player die
	---------------------------------------- */

core.prototype.player_die = function(player_id) {
  var player = this.state.players[player_id];
  if (!player || player.dead) {
    return;
  }

  player.dead = true;

  var obj = this.state.objects["player-" + player_id];
  obj.type = "player_missile";
  obj.c = this.c.objects["player_missile"];

  // figure out gems to spawn
  var n = max(round(player.score / 2), 3);
  var gems = [];
  while (n > 200) {
    gems.push(200);
    n -= 200;
  }
  while (n > 50) {
    gems.push(50);
    n -= 50;
  }
  while (n > 20) {
    gems.push(20);
    n -= 20;
  }
  while (n > 5) {
    gems.push(5);
    n -= 5;
  }
  while (n > 1) {
    gems.push(1);
    n -= 1;
  }

  // spawn them
  var angle_inc = round(360 / gems.length);
  for (var i = 0; i < gems.length; i++) {
    var n = ((i % 3) + 1) * 2;
    var xy = xy_speed(angle_inc * i, n);
    this.create_object({
      type: "gem-" + gems[i],
      player_id: obj.player_id,
      x: obj.x,
      y: obj.y,
      speed_x: xy.x.fixed(),
      speed_y: xy.y.fixed(),
      data: i + 1
    });
  }
};

/* Run through players
	---------------------------------------- */

core.prototype.frame_players = function(ignore) {
  // run through all objects
  for (var key in this.state.players) {
    if (parseInt(key) !== ignore) {
      this.frame_player(this.state.players[key]);
    }
  }
};

core.prototype.frame_player = function(player) {
  if (!player) {
    return;
  }

  // cooldown
  if (player.cooldown > 0) {
    player.cooldown--;
  }

  // hit
  if (player.hit > 0) {
    player.hit--;
  }

  // health regen
  if (this.state.frame % 24 === 0) {
    if (player.health < this.scheme.levels.health[player.level]) {
      this.player_health_add(player.id, 2, true);
    }
  }

  // remove old events
  for (var i = 0; i < player.events.length; i++) {
    if (this.state.frame > player.events[i].frame + 18) {
      player.events.splice(i, 1);
    }
  }
};

/* Run through player locked objects
	---------------------------------------- */

core.prototype.frame_player_lock = function(player) {
  var player_obj = this.state.objects["player-" + player.id];
  var obj = this.state.objects[player.locked];
  if (player_obj && obj) {
    player_obj.x = obj.x;
    player_obj.y = obj.y;
    player_obj.speed_x = obj.speed_x;
    player_obj.speed_y = obj.speed_y;
  } else {
    player.locked = "";
  }
};

/* Get damage modifiers from player
	---------------------------------------- */

core.prototype.get_damage = function(obj) {
  var damage = obj.c.damage;
  var player = this.state.players[obj.player_id];
  if (player && damage !== 0 && !obj.c.ignore_level_damage) {
    var level = this.scheme.levels.damage[player.level];
    if (level) {
      damage += level;
    }
  }
  return damage;
};
