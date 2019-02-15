/* ========================================================================
    Game
    Run Players
 ========================================================================== */

/* Start this player
	---------------------------------------- */

game.prototype.init_player = function(player, preserve_events, remove_events) {
  var new_player;

  // use sources
  if (player) {
    var core_player = this.core.state.players[player.id];
    if (preserve_events && core_player) {
      player.events = core_player.events.concat(player.events);
    }
    new_player = this.core.create_player(player);
    if (remove_events) {
      new_player.events = [];
    }

    // create new
  } else {
    new_player = this.core.create_player({ id: this.player_id });
    this.create_object({ type: "player", player_id: this.player_id });
    this.core.init_player(this.player_id);
  }

  // set this player
  if (new_player.id === this.player_id) {
    this.player = new_player;
    this.set_armoury();
  }
};

/* Resolve players from other states
	---------------------------------------- */

game.prototype.run_players_events = function(players) {
  // clear object actioned events
  for (var key in this.core.state.objects) {
    this.core.state.objects[key].actioned = false;
  }

  // run player events
  for (var key in this.core.state.players) {
    this.run_player_events(this.core.state.players[key]);
  }

  // remove old events
  for (var id in this.player_events) {
    for (var key in this.player_events[id]) {
      if (this.core.state.frame > this.player_events[id][key] + 30) {
        delete this.player_events[id][key];
      }
    }
  }
};

game.prototype.run_player_events = function(player) {
  // init player events
  if (!this.player_events[player.id]) {
    this.player_events[player.id] = {};
  }

  // go through events
  for (var i = 0; i < player.events.length; i++) {
    var event = player.events[i];
    var key = event.frame + "-" + event.type;
    if (!this.player_events[key]) {
      this.player_event(player, event);
      this.player_events[key] = this.core.state.frame;
      break;
    }
  }
};

/* Player action
	---------------------------------------- */

game.prototype.player_event = function(player, event) {
  // is there isn't an action
  if (!event) {
    return;
  }

  // get player object
  var obj = this.core.state.objects["player-" + player.id];
  if (!obj) {
    return;
  }

  // mark object as having performed an action
  obj.actioned = true;

  // movement
  if (event.type === "walk") {
    obj.ds = this.scheme.levels.speed[player.level] || obj.c.speed.move;
  }

  // jump
  if (event.type === "jump") {
    obj.ds = this.scheme.levels.jump[player.level] || obj.c.speed.jump;

    // play jump sound
    this.run_event_sound({
      sound: "jump",
      x: obj.x,
      y: obj.y
    });
  }

  // shooting
  if (event.type === "shoot") {
    var weapon = this.c.weapons[event.weapon];
    var weapon_obj = this.c.objects[weapon.object];

    // are we firing the weapon
    if (obj.player_id === this.player_id) {
      this.detonation_cooldown = min(20, weapon.cooldown);
      this.weapon_following = this.weapon_follow ? event.obj : "";

      // other players shots
    } else {
      var shot_obj = this.core.state.objects[event.obj];
      if (shot_obj) {
        shot_obj.hide = 0;
        shot_obj.dx = obj.dx;
        shot_obj.dy = obj.dy;
        obj.barrel_angle = this.core.map.get_heading(
          obj.x,
          obj.y,
          shot_obj.x,
          shot_obj.y
        );
      }
    }

    // if we are not a player and auto follow weapons
    if (this.player_id === null) {
      if (obj.player_id === parseInt(this.leader) && weapon.auto_follow) {
        this.weapon_following = event.obj;
      }
    }

    // weapon just fired sprite
    if (weapon.fire_sprite) {
      var sprite_key = "ant-weapon-" + weapon.fire_sprite;
      var animation = this.c.animations[sprite_key + "-left"];
      obj.fire_sprite = sprite_key;
      obj.fire_sprite_count = animation ? animation.length + 1 : 1;
      obj.fire_sprite_frame = this.core.state.frame;
    }

    // weapon body sprite
    if (weapon.fire_body_sprite) {
      var cool = weapon_obj.timeout
        ? weapon_obj.timeout + 5
        : weapon.cooldown + 5;
      obj.fire_body_sprite = "ant-body-" + weapon.fire_body_sprite;
      obj.fire_body_sprite_count = cool;
    }

    // weapon angle lock
    if (weapon.fire_angle_lock) {
      var cool = weapon_obj.timeout
        ? weapon_obj.timeout + 5
        : weapon.cooldown + 5;
      obj.fire_direction = obj.direction;
      obj.fire_angle_lock = obj.barrel_angle;
      obj.fire_angle_lock_count = cool;
    }

    // play sound effect
    this.play_weapon_audio({
      x: obj.dx,
      y: obj.dy,
      player_id: obj.player_id,
      weapon: event.weapon
    });
  }

  // collect a crate or medpack
  if (event.type === "crate" || event.type === "medpack") {
    // remove the object
    if (this.core.state.objects[event.obj]) {
      delete this.core.state.objects[event.obj];
    }

    // play sound effect
    this.run_event_sound({
      x: obj.x,
      y: obj.y,
      sound: "locknload"
    });
  }

  // collected a gem
  if (event.type === "gem") {
    // remove the object
    if (this.core.state.objects[event.obj]) {
      delete this.core.state.objects[event.obj];
    }

    // play sound effect
    this.run_event_sound({
      x: obj.x,
      y: obj.y,
      sound: "bing"
    });
  }
};

/* Set this player references
	---------------------------------------- */

game.prototype.set_this_player_refs = function() {
  // set player ref
  if (this.core.state.players[this.player_id]) {
    this.player = this.core.state.players[this.player_id];
  }

  // set object ref
  if (this.core.state.objects["player-" + this.player_id]) {
    this.player_obj = this.core.state.objects["player-" + this.player_id];
  }
};
