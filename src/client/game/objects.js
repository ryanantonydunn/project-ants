/* ========================================================================
    Game
    Run Objects
 ========================================================================== */

/* Start objects
	---------------------------------------- */

game.prototype.create_object = function(props, spawn) {
  // use existing props to make new core object
  var obj = this.core.create_object(props);

  // previous position
  obj.px = obj.x;
  obj.py = obj.y;
  obj.pg = false;
  obj.px2 = obj.x;
  obj.py2 = obj.y;

  // display values
  obj.heading = 0;
  obj.hide = 0;
  obj.barrel_angle = 0;
  obj.actioned = false;
  obj.player_locked = false;

  // display position
  obj.dx = obj.x;
  obj.dy = obj.y;
  obj.ds = 0;

  // check for shoot events
  this.set_shot_object(obj);

  // previous display position
  obj.pdx = obj.x;
  obj.pdy = obj.y;

  // spawn
  if (obj.c.spawn || spawn) {
    // hide new object for x frames
    obj.hide = 9;

    // add a spawn decoration over top
    this.create_decoration({
      x: obj.x,
      y: obj.y,
      timeout: 16,
      repeat: false,
      type: "spawn",
      sprite: "teleport"
    });

    // play spawn sound
    this.run_event_sound({
      sound: "phase",
      x: obj.x,
      y: obj.y
    });
  }

  return obj;
};

/* Set a shot items new location
	---------------------------------------- */

game.prototype.set_shot_object = function(obj) {
  // check for a player
  var player = this.core.state.players[obj.player_id];
  if (!player) {
    return;
  }

  // check for an action
  for (var i = 0; i < player.events.length; i++) {
    var act = player.events[i];
    if (act.obj === obj.key) {
      obj.hide = 100;
    }
  }
};

/* Run objects
	---------------------------------------- */

game.prototype.run_objects = function() {
  // check for player locked objects
  for (var key in this.core.state.objects) {
    var obj = this.core.state.objects[key];
    if (obj.c.player_lock) {
      var player = this.core.state.objects["player-" + obj.player_id];
      if (player) {
        player.player_locked = true;
      }
    }
  }

  for (var key in this.core.state.objects) {
    this.run_object(this.core.state.objects[key]);
  }
};

game.prototype.run_object = function(obj) {
  // snap immediately if us
  if (obj.player_id === this.player_id) {
    obj.dx = obj.x;
    obj.dy = obj.y;

    // prevent bobbling
    if (obj.x === obj.px2 && obj.y === obj.py2) {
      obj.dx = obj.pdx;
      obj.dy = obj.pdy;
    }

    // interpolate others
  } else {
    // get max speed of movement
    if (!obj.actioned) {
      obj.ds = get_speed(obj.speed_x, obj.speed_y);
    }

    // interpolate
    var dist_x = this.core.map.get_distance_x(obj.dx, obj.x);
    var dist_y = this.core.map.get_distance_y(obj.dy, obj.y);
    var max_speed = this.core.map.get_distance(obj.dx, obj.dy, obj.x, obj.y);
    var speed = max(max_speed / 4, min(max_speed, obj.ds));
    var move = check_speed(dist_x, dist_y, speed);
    obj.dx = this.core.map.loop_x(obj.dx + round(move.x));
    obj.dy = this.core.map.loop_y(obj.dy + round(move.y));
  }

  // have we moved
  var moved = obj.pdx !== obj.dx || obj.pdy !== obj.dy;

  // set heading and barrel angle
  if (moved) {
    obj.heading = this.core.map.get_heading(obj.pdx, obj.pdy, obj.dx, obj.dy);
    obj.barrel_angle = increment_angle(obj.barrel_angle, obj.heading, 3);
  }

  // is us
  if (obj.player_id === this.player_id) {
    obj.barrel_angle = obj.player_locked ? obj.heading : this.crosshair;
  }

  // if we have just landed set initial angle
  if (obj.grounded && !obj.pg) {
    var angle = get_angle(obj.speed_x, obj.speed_y);
    var walk = this.core.map.walk(obj.x, obj.y, obj.px, obj.py, angle, 6);
    if (walk.move) {
      obj.angle = walk.angle;
      obj.direction = walk.direction;
      obj.px = obj.x;
      obj.py = obj.y;
      obj.animate = false;
    }
  }

  // if walking
  else if (obj.grounded) {
    // set the display values
    var dist_x = this.core.map.get_distance_x(obj.pdx, obj.dx);
    var dist_y = this.core.map.get_distance_y(obj.pdy, obj.dy);
    var amount_moved = get_speed(dist_x, dist_y);
    if (amount_moved > 3) {
      obj.animate = true;
      obj.direction = this.core.map.ground_dir(
        obj.pdx,
        obj.pdy,
        obj.dx,
        obj.dy
      );
      obj.angle = obj.heading;
    } else {
      obj.animate = obj.c.animation.ground;
    }

    // set sprites
    var suffix = obj.animate ? "-walk-" : "-still-";
    obj.sprite_key = obj.c.animation.sprite + suffix + obj.direction;
    obj.display_angle =
      obj.direction === "left" ? obj.angle : angle_add(obj.angle, 180);

    // not walking
  } else {
    obj.sprite_key = obj.c.animation.sprite;
    obj.animate = true;

    // players
    var player = this.core.state.players[obj.player_id];
    if (obj.type === "player" && player.hit === 0) {
      obj.direction =
        obj.barrel_angle >= 90 && obj.barrel_angle < 270 ? "right" : "left";
      obj.sprite_key += "-air-" + obj.direction;
      obj.display_angle =
        obj.direction === "left"
          ? obj.barrel_angle
          : angle_add(obj.barrel_angle, 180);
    }

    // spinning in the air
    else if (obj.c.animation.air_spin) {
      var ground = this.core.map.ground_pixel(round(obj.dx), round(obj.dy));
      var speed = get_speed(obj.speed_x, obj.speed_y);
      var n = ground ? 0 : 1;
      var angle_adding = moved ? speed * 2 : n;
      obj.display_angle = angle_add(obj.display_angle, angle_adding);

      // pointing towards trajectory
    } else {
      if (round(abs(obj.speed_x) === 0) && round(abs(obj.speed_y) === 0)) {
        if (obj.c.animation.air_spin) {
          obj.display_angle = angle_add(obj.display_angle, 2);
        }
      } else {
        obj.display_angle = angle_add(
          get_angle(-obj.speed_x, -obj.speed_y),
          90
        );
      }
    }
  }

  // static angle flag
  if (obj.c.animation.static_angle) {
    obj.display_angle = 0;
  }

  // weapon just fired flags
  if (obj.fire_sprite_count) {
    obj.fire_sprite_count--;
  }
  if (obj.fire_angle_lock_count) {
    obj.direction = obj.fire_direction;
    obj.display_angle =
      obj.direction === "left"
        ? obj.fire_angle_lock
        : angle_add(obj.fire_angle_lock, 180);
    obj.fire_angle_lock_count--;
  }
  if (obj.fire_body_sprite_count) {
    obj.sprite_key = obj.fire_body_sprite + "-" + obj.direction;
    obj.animate = true;
    obj.fire_body_sprite_count--;
  }

  // previous position
  obj.px2 = obj.px;
  obj.py2 = obj.py;
  obj.px = obj.x;
  obj.py = obj.y;
  obj.pg = obj.grounded;
  obj.pdx = obj.dx;
  obj.pdy = obj.dy;
  obj.player_locked = false;
};
