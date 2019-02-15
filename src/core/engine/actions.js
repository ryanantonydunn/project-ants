/* ========================================================================
    Actions
 ========================================================================== */

/* Perform action
	---------------------------------------- */

core.prototype.action = function(player_id, action) {
  var response = { success: false };
  var player = this.state.players[player_id];
  var obj = this.state.objects["player-" + player_id];
  if (!player || !action || !obj) {
    return response;
  }

  var locked_obj = this.state.objects[player.locked];

  // players can do stuff
  if (!player.dead && !locked_obj && player.hit === 0) {
    // run them
    if (action.action === "move") {
      response = this.action_move(response, player, obj, action);
    }
    if (action.action === "jump") {
      response = this.action_jump(response, player, obj, action);
    }
    if (action.action === "shoot") {
      response = this.action_shoot(response, player, obj, action);
    }
  }

  response.x = obj.x;
  response.y = obj.y;
  response.speed_x = obj.speed_x;
  response.speed_y = obj.speed_y;
  response.frame = this.state.frame;

  // return status
  return response;
};

/* Walking
	---------------------------------------- */

core.prototype.action_move = function(response, player, obj, action) {
  response.type = "walk";

  if (obj.grounded) {
    var speed = this.scheme.levels.speed[player.level] || obj.c.speed.move;
    var speed = action.speed || speed;
    var walk = this.map.walk(obj.x, obj.y, obj.x, obj.y, action.angle, speed);
    if (walk.move) {
      if (this.action_walk_move(obj, walk.path)) {
        // record player event
        player.events.push({ frame: this.state.frame, type: "walk" });

        // return success
        response.success = true;
      }
    }
  }

  return response;
};

/* Walking in a direction
	---------------------------------------- */

core.prototype.action_walk_dir = function(obj, dir, speed) {
  var speed = speed || obj.c.speed.move;

  // get initial path
  var walk = this.map.walk(obj.x, obj.y, obj.x, obj.y, 0, speed);

  if (walk.direction != dir) {
    walk = this.map.walk(obj.x, obj.y, obj.x, obj.y, 180, speed);
    if (walk.direction != dir) {
      walk = this.map.walk(obj.x, obj.y, obj.x, obj.y, 90, speed);
      if (walk.direction != dir) {
        walk = this.map.walk(obj.x, obj.y, obj.x, obj.y, 270, speed);
        if (walk.direction != dir) {
          return;
        }
      }
    }
  }
  if (!walk.move) {
    return;
  }

  this.action_walk_move(obj, walk.path);
};

/* Walk moving
	---------------------------------------- */

core.prototype.action_walk_move = function(obj, path) {
  // go through the course
  var x1 = obj.x;
  var y1 = obj.y;
  for (var i = 1; i < path.length; i++) {
    var point = path[i];

    // check object collisions
    var col = this.collisions(obj, point.x, point.y);
    if (col) {
      return;
    }

    obj.x = point.x;
    obj.y = point.y;
    obj.moved = true;
  }

  if (obj.moved) {
    return true;
  }
};

/* Jumping
	---------------------------------------- */

core.prototype.action_jump = function(response, player, obj, action) {
  response.type = "jump";

  if (obj.grounded && player.cooldown === 0) {
    var speed = this.scheme.levels.jump[player.level] || obj.c.speed.jump;
    var xy = xy_speed(action.angle, speed);
    obj.speed_x = xy.x.fixed();
    obj.speed_y = xy.y.fixed();
    if (this.physics_move(obj)) {
      // set grounding
      obj.grounded = false;

      // set cooldown
      player.cooldown = 7;

      // record player event
      player.events.push({ frame: this.state.frame, type: "jump" });

      // return success
      response.success = true;
    }
  }

  return response;
};

/* Shooting weapon
	---------------------------------------- */

core.prototype.action_shoot = function(response, player, obj, action) {
  response.type = "shoot";

  // if waiting for cooldown
  // is not real weapon
  // do we need to walk
  // check armoury count
  var weapon = this.c.weapons[action.weapon];
  if (
    (player.cooldown === 0 && !weapon) ||
    (weapon.require_walk && !obj.grounded) ||
    player.armoury[action.weapon] === 0
  ) {
    return response;
  }

  // crate the object
  var speed = xy_speed(action.angle, weapon.speed);
  var shot_obj = this.create_object({
    type: weapon.object,
    player_id: player.id,
    x: obj.x,
    y: obj.y,
    speed_x: (speed.x + obj.speed_x * weapon.inertia).fixed(),
    speed_y: (speed.y + obj.speed_y * weapon.inertia).fixed()
  });

  // set player recoil
  if (!obj.grounded) {
    obj.speed_x += (-speed.x * weapon.recoil).fixed();
    obj.speed_y += (-speed.y * weapon.recoil).fixed();
  }

  // set armoury values
  this.update_player_armoury(player.id, action.weapon, -1);

  // set cooldown
  player.cooldown = weapon.cooldown;

  // set player lock
  if (shot_obj.c.player_lock) {
    player.locked = shot_obj.key;
  }

  // record player event
  player.events.push({
    frame: this.state.frame,
    type: "shoot",
    obj: shot_obj.key,
    weapon: action.weapon
  });

  // return success
  response.success = true;
  return response;
};
