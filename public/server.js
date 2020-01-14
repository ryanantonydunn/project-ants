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

/* ========================================================================
    Collisions
 ========================================================================== */

/* Run single collision check
	---------------------------------------- */

core.prototype.collisions = function(obj, x, y) {
  // check collision with ground
  if (this.map.i(round(x), round(y))) {
    var event = this.event(obj, "ground", null);
    if (event) {
      return event;
    }
  }

  // check collisions with other objects
  for (var key in this.state.objects) {
    if (obj.key === key) {
      continue;
    }
    if (this.collision_obj(obj, x, y, this.state.objects[key])) {
      return true;
    }
  }

  return false;
};

/* Run object collision check
	---------------------------------------- */

core.prototype.collision_obj = function(obj, x, y, check_obj) {
  // if no collision
  if (
    this.collision_check(
      x,
      y,
      check_obj.x,
      check_obj.y,
      obj.c.size,
      check_obj.c.size
    )
  ) {
    return;
  }

  // prevent hits on parent players for a short time or if they're player locked
  if (
    check_obj.type === "player" &&
    check_obj.player_id === obj.player_id &&
    (this.state.frame < obj.frame + 15 || obj.c.player_lock)
  ) {
    return;
  }

  // prevent clusters hitting each other for a short time
  if (
    check_obj.frame === obj.frame &&
    check_obj.player_id === obj.player_id &&
    this.state.frame < obj.frame + 60
  ) {
    return;
  }

  // trigger basic object collision event
  if (this.event(obj, "object", check_obj)) {
    return true;
  }

  // trigger specific object collision event
  var event = obj.c.object_events[check_obj.type];
  if (event) {
    if (this.run_event(obj, event, check_obj)) {
      return true;
    }
  }
};

/* Collision Maths
	---------------------------------------- */

core.prototype.collision_check = function(x1, y1, x2, y2, s1, s2) {
  return this.map.get_distance(x1, y1, x2, y2) > s1 + s2;
};

/* ========================================================================
    Core
 ========================================================================== */

/* create core object
	---------------------------------------- */

function core(config, scheme, map, gravity_map) {
  // config
  this.c = config;
  this.scheme = scheme;
  this.map = new core_map(map, scheme, gravity_map);

  // crate chance table
  this.crate_list = [];
  for (var key in this.scheme.weapons) {
    for (var i = 0; i < this.scheme.weapons[key].crate_chance; i++) {
      this.crate_list.push(key);
    }
  }

  // armoury reference table
  this.armoury_refs = [];
  for (key in this.scheme.weapons) {
    this.armoury_refs.push(key);
  }
}

/* Set a blank state
	---------------------------------------- */

core.prototype.blank_state = function() {
  return {
    frame: 0,
    explosions: {},
    objects: {},
    players: {},
    events: []
  };
};

/* Run every frame
	---------------------------------------- */

core.prototype.frame = function() {
  this.frame_explosions();
  this.frame_players();
  this.frame_objects();
};

/* ========================================================================
    Events
 ========================================================================== */

/* Run a specific type of event
	---------------------------------------- */

core.prototype.event = function(obj, type, collided_obj) {
  var event = obj.c.events[type];
  if (!event) {
    return;
  }
  return this.run_event(obj, event, collided_obj, type);
};

/* Run a specific event
	---------------------------------------- */

core.prototype.run_event = function(obj, event, collided_obj, type) {
  // handle arrays of events
  if (Array.isArray(event)) {
    var stop = false;
    for (var i = 0; i < event.length; i++) {
      var stop2 = this.run_event(obj, event[i], collided_obj, type);
      stop = stop2 ? true : stop;
    }
    return stop;
  }

  // run event function
  if (event === "die") {
    return this.event_die(obj, collided_obj, type);
  } else if (event === "kill") {
    return this.event_kill(obj, collided_obj);
  } else if (event === "explode") {
    return this.event_explode(obj);
  } else if (event === "hit_give") {
    return this.event_hit_give(obj, collided_obj, type);
  } else if (event === "hit_receive") {
    return this.event_hit_receive(obj, collided_obj, type);
  } else if (event === "destroy") {
    return this.event_destroy(obj);
  } else if (event === "cluster") {
    return this.event_cluster(obj);
  } else if (event === "bounce") {
    return this.event_bounce(obj, collided_obj, type);
  } else if (event === "bounce_explode") {
    return this.event_bounce_explode(obj, collided_obj, type);
  } else if (event === "stick") {
    return this.event_stick(obj);
  } else if (event === "slide") {
    return this.event_slide(obj);
  } else if (event === "player_bounce") {
    return this.event_player_bounce(obj, collided_obj, type);
  } else if (event === "drag_player") {
    return this.event_drag_player(obj);
  } else if (event === "spawn_ghost") {
    return this.event_spawn_ghost(obj);
  } else if (event === "collect") {
    return this.event_collect(obj, collided_obj);
  }
};

/* Object die
	---------------------------------------- */

core.prototype.event_die = function(obj, collided_obj, type) {
  // die event
  this.event(obj, "die");

  // check for destroy events
  if (this.scheme.events.destroy) {
    if (this.scheme.events.destroy[obj.id]) {
      this.state.events.push(this.scheme.events.destroy[obj.id]);
    }
  }

  // delete the object
  delete this.state.objects[obj.key];

  return true;
};

/* Object kill
	---------------------------------------- */

core.prototype.event_kill = function(obj, collided_obj) {
  // destroy it
  this.run_event(collided_obj, "die");
};

/* Explode
	---------------------------------------- */

core.prototype.event_explode = function(obj) {
  // create explosion object
  this.create_explosion({
    player_id: obj.player_id,
    x: obj.x,
    y: obj.y,
    parent: obj.key,
    parent_type: obj.type
  });
};

/* Give a hit
	---------------------------------------- */

core.prototype.event_hit_give = function(obj, collided_obj, type) {
  return this.run_event(collided_obj, "hit_receive", obj, type);
};

/* Receive a hit
	---------------------------------------- */

core.prototype.event_hit_receive = function(obj, collided_obj, type) {
  // prevent instant hits
  if (obj.hits) {
    for (var key in obj.hits) {
      if (key === collided_obj.key) {
        return;
      }
    }
  }

  // calculate direction and distance it came from
  var angle = this.map.get_heading(
    obj.x,
    obj.y,
    collided_obj.x,
    collided_obj.y
  );
  var distance = this.map.get_distance(
    obj.x,
    obj.y,
    collided_obj.x,
    collided_obj.y
  );

  // get damage values from collided object
  var damage = this.get_damage(collided_obj);
  var knock = collided_obj.c.knock;
  if (collided_obj.type === "explosion") {
    damage *= max(0, (damage * 2 - distance) / (damage * 2));
  }

  // ignore if there's no damage
  if (damage === 0) {
    return;
  }

  // knock object
  if (knock > 0) {
    var xy = xy_speed(angle, damage);
    obj.speed_x -= xy.x.fixed();
    obj.speed_y -= xy.y.fixed();
    obj.grounded = false;
  }

  // are we hitting player
  if (obj.type === "player") {
    this.player_health_add(obj.player_id, -round(damage));
    var player = this.state.players[obj.player_id];
    if (player) {
      player.hit = damage * 2;
    }
  }

  // sound effect
  if (collided_obj.c.audio.hit) {
    this.state.events.push({
      type: "sound",
      x: obj.x,
      y: obj.y,
      sound: collided_obj.c.audio.hit
    });
  }

  // set hits
  if (!obj.hits) {
    obj.hits = {};
  }
  obj.hits[collided_obj.key] = true;
};

/* Destroy ground
	---------------------------------------- */

core.prototype.event_destroy = function(obj) {
  // limit to once per frame
  if (obj.destroyed) {
    return;
  }
  obj.destroyed = true;

  var damage = this.get_damage(obj);

  // record ground damage
  this.state.events.push({
    type: "ground_damage",
    frame: this.state.frame,
    dig: true,
    x: obj.x,
    y: obj.y,
    radius: damage
  });
};

/* Object bounce
	---------------------------------------- */

core.prototype.event_bounce = function(obj, collided_obj, type) {
  // if grounded dont do anything
  if (obj.grounded) {
    return true;
  }

  // check speed
  var speed = get_speed(obj.speed_x, obj.speed_y);
  var check_speed = speed * obj.c.bounce;
  if (check_speed < 1) {
    obj.speed_x = 0;
    obj.speed_y = 0;
    return true;
  }

  // get new direction angle
  var direction = get_angle(obj.speed_x, obj.speed_y);
  var surface_angle = 0;

  // get angle from ground
  if (type === "ground") {
    var walk = this.map.walk(round(obj.x), round(obj.y), 0, 0, direction, 6);
    if (walk.move) {
      surface_angle = walk.angle;
    }
  }

  // get angle from object
  else {
    var heading = this.map.get_heading(
      obj.x,
      obj.y,
      collided_obj.x,
      collided_obj.y
    );
    surface_angle = angle_add(heading, 90);
  }

  // reflect direction angle with collision angle
  var reflection = (direction - surface_angle) * 2;
  var new_angle = angle_add(direction, -reflection);

  // transform main velocity towards new angle
  var new_speed = xy_speed(new_angle, check_speed);
  obj.speed_x = new_speed.x.fixed();
  obj.speed_y = new_speed.y.fixed();

  // record bounce event
  if (speed > 2) {
    this.state.events.push({
      type: "bounce",
      x: obj.x,
      y: obj.y,
      obj: obj.key
    });
  }

  return true;
};

/* Object stick to ground
	---------------------------------------- */

core.prototype.event_stick = function(obj) {
  obj.grounded = true;
  obj.speed_x = 0;
  obj.speed_y = 0;
  return true;
};

/* Object slide
	---------------------------------------- */

core.prototype.event_slide = function(obj) {
  var angle = get_angle(obj.speed_x, obj.speed_y);
  var walk = this.map.walk(obj.x, obj.y, obj.x, obj.y, angle, obj.speed_left);
  if (walk.move) {
    this.action_walk_move(obj, walk.path);
  }
  return true;
};

/* Player bounce
	---------------------------------------- */

core.prototype.event_player_bounce = function(obj, collided_obj, type) {
  // if grounded dont do anything
  if (obj.grounded) {
    return true;
  }

  var player = this.state.players[obj.player_id];
  if (!player) {
    return;
  }
  var speed = get_speed(obj.speed_x, obj.speed_y);

  var max_speed = this.scheme.levels.jump[player.level] || 0;
  max_speed += 10;
  if (player.hit > 0 || speed > max_speed) {
    return this.run_event(obj, "bounce", collided_obj, type);
  } else {
    return this.run_event(obj, "stick");
  }
};

/* Drag player
	---------------------------------------- */

core.prototype.event_drag_player = function(obj) {
  var player_obj = this.state.objects["player-" + obj.player_id];
  if (!player_obj) {
    return;
  }

  player_obj.speed_x = obj.speed_x;
  player_obj.speed_y = obj.speed_y;
  player_obj.dragged = true;
};

/* First Destroy
	---------------------------------------- */

core.prototype.event_bounce_explode = function(obj, collided_obj, type) {
  if (obj.frame + 10 > this.state.frame) {
    return this.run_event(obj, "bounce", collided_obj, type);
  } else {
    return this.run_event(obj, "explode");
  }
};

/* Spawn player ghost
	---------------------------------------- */

core.prototype.event_spawn_ghost = function(obj) {
  // transform object into ghost
  obj.type = "player_ghost";
  obj.c = this.c.objects["player_ghost"];
  obj.speed_x = 0;
  obj.speed_y = 0;
};

/* Clusters
	---------------------------------------- */

core.prototype.event_cluster = function(obj) {
  // set off explosions
  this.run_event(obj, "explode");

  // get cluster constants
  var cluster = obj.c.cluster;

  // get opposite angle of gravity
  var angle = this.map.get_gravity_angle(obj.x, obj.y);
  angle = angle_add(angle, 135);

  // go through clusters
  var range = cluster.circle ? 360 - 360 / cluster.count : 90;
  var angle_diff = range / (cluster.count - 1);
  for (var i = 0; i < cluster.count; i++) {
    // create cluster objects
    var launch_angle = angle_add(angle, i * angle_diff);
    var speed = xy_speed(launch_angle, cluster.speed);

    // create cluster object
    this.create_object({
      type: cluster.object,
      id: obj.id,
      data: i + 1,
      player_id: obj.player_id,
      x: obj.x,
      y: obj.y,
      speed_x: speed.x.fixed(),
      speed_y: speed.y.fixed()
    });
  }

  return true;
};

/* Collect Crate
	---------------------------------------- */

core.prototype.event_collect = function(obj, collided_obj) {
  // prep event to send to game
  var event = {
    type: "collect",
    obj: collided_obj.key,
    player_id: obj.player_id
  };
  var player = this.state.players[obj.player_id];
  if (!player) {
    return;
  }

  // crate
  if (collided_obj.type === "crate") {
    var count = this.scheme.weapons[collided_obj.data].crate_count;
    count = count === -1 ? "infinite" : count;
    this.update_player_armoury(obj.player_id, collided_obj.data, count);
    event.collected = "crate";
    event.weapon = collided_obj.data;
    event.count = count;
    player.events.push({
      frame: this.state.frame,
      type: "crate",
      obj: collided_obj.key
    });
  }

  // medpack
  else if (collided_obj.type === "medpack") {
    this.player_health_add(obj.player_id, this.scheme.drops.medpack.add);
    event.collected = "medpack";
    player.events.push({
      frame: this.state.frame,
      type: "medpack",
      obj: collided_obj.key
    });
  }

  // gems
  else if (collided_obj.type === "gem-1") {
    this.player_score_add(obj.player_id, 1);
    event.collected = "gem";
    event.n = 1;
    player.events.push({
      frame: this.state.frame,
      type: "gem",
      obj: collided_obj.key
    });
  } else if (collided_obj.type === "gem-5") {
    this.player_score_add(obj.player_id, 5);
    event.collected = "gem";
    event.n = 5;
    player.events.push({
      frame: this.state.frame,
      type: "gem",
      obj: collided_obj.key
    });
  } else if (collided_obj.type === "gem-20") {
    this.player_score_add(obj.player_id, 20);
    event.collected = "gem";
    event.n = 20;
    player.events.push({
      frame: this.state.frame,
      type: "gem",
      obj: collided_obj.key
    });
  } else if (collided_obj.type === "gem-50") {
    this.player_score_add(obj.player_id, 50);
    event.collected = "gem";
    event.n = 50;
    player.events.push({
      frame: this.state.frame,
      type: "gem",
      obj: collided_obj.key
    });
  } else if (collided_obj.type === "gem-200") {
    this.player_score_add(obj.player_id, 200);
    event.collected = "gem";
    event.n = 200;
    player.events.push({
      frame: this.state.frame,
      type: "gem",
      obj: collided_obj.key
    });
  }

  // record event
  this.state.events.push(event);

  // kill object
  this.run_event(collided_obj, "die", obj, "collect");

  // check for collection events
  if (this.scheme.events.collect) {
    if (this.scheme.events.collect[collided_obj.id]) {
      this.state.events.push(this.scheme.events.collect[collided_obj.id]);
    }
  }

  return false;
};

/* ========================================================================
    Explosions
 ========================================================================== */

/* Create an explosion
	---------------------------------------- */

core.prototype.create_explosion = function(props, state) {
  var state_ref = state || this.state;

  var obj = {
    type: "explosion",
    player_id: "",
    frame: state_ref.frame,
    x: 0,
    y: 0,
    parent: "",
    parent_type: ""
  };
  obj = deepmerge(obj, props);
  obj.c = this.c.objects[obj.parent_type];

  // add to state objects
  state_ref.explosions[obj.parent] = obj;
};

/* Check all existing explosions
	---------------------------------------- */

core.prototype.frame_explosions = function() {
  // go through all explosions
  for (var key in this.state.explosions) {
    var explode = this.state.explosions[key];

    // if expired remove
    if (this.state.frame > explode.frame + 40) {
      delete this.state.explosions[key];
    }

    // if exploding this frame run
    if (this.state.frame === explode.frame + 1) {
      this.run_explosion(explode);
    }
  }
};

/* Run an explosion
	---------------------------------------- */

core.prototype.run_explosion = function(explode) {
  // if no damage
  if (!explode.c.damage) {
    return;
  }

  // calculate additional player damage
  var damage = this.get_damage(explode);

  // check collisions
  for (key in this.state.objects) {
    var obj = this.state.objects[key];

    // if object was just made
    if (this.state.frame < obj.frame + 2) {
      continue;
    }

    // run collision check
    if (
      !this.collision_check(
        obj.x,
        obj.y,
        explode.x,
        explode.y,
        obj.c.size,
        damage * 2
      )
    ) {
      this.event(obj, "explosion", explode);
    }
  }

  // record ground damage
  var ptype = this.c.objects[explode.parent_type];
  if (ptype && ptype.destroy_ground) {
    this.state.events.push({
      type: "ground_damage",
      frame: this.state.frame,
      x: explode.x,
      y: explode.y,
      radius: damage
    });
  }
};

/* ========================================================================
    Objects
 ========================================================================== */

/* Create a new game object
	---------------------------------------- */

core.prototype.create_object = function(props, state) {
  var state_ref = state || this.state;

  var obj = {
    type: "",
    player_id: "",
    id: "",
    frame: state_ref.frame,
    grounded: false,
    x: 0,
    y: 0,
    speed_x: 0,
    speed_y: 0,
    data: ""
  };
  obj = deepmerge(obj, props);
  obj.c = this.c.objects[obj.type];
  var key_type = obj.type;

  // set key
  if (
    obj.type === "player" ||
    obj.type === "player_ghost" ||
    obj.type === "player_missile"
  ) {
    obj.key = "player-" + obj.player_id;
  } else {
    obj.key =
      obj.type +
      "-" +
      obj.player_id +
      "-" +
      obj.id +
      "-" +
      obj.frame +
      "-" +
      obj.data;
  }

  // add to state objects
  state_ref.objects[obj.key] = obj;

  // return it
  return obj;
};

/* Snap object to another object
	---------------------------------------- */

core.prototype.snap_object = function(obj1, obj2) {
  obj1.grounded = obj2.grounded;
  obj1.x = obj2.x;
  obj1.y = obj2.y;
  obj1.speed_x = obj2.speed_x;
  obj1.speed_y = obj2.speed_y;
};

/* Run through object frame events
	---------------------------------------- */

core.prototype.frame_objects = function() {
  // run through all objects
  for (var key in this.state.objects) {
    this.frame_object(this.state.objects[key]);
  }

  // check for player lock
  for (var key in this.state.players) {
    this.frame_player_lock(this.state.players[key]);
  }
};

core.prototype.frame_object = function(obj) {
  if (!obj) {
    return;
  }
  obj.destroyed = false;

  // stopping
  if (obj.c.stop > 0 && this.state.frame > obj.frame + obj.c.stop) {
    obj.speed_x = 0;
    obj.speed_y = 0;
  }

  // timeout
  if (obj.c.timeout > 0 && obj.frame + obj.c.timeout <= this.state.frame) {
    this.run_event(obj, "die");
    return;
  }

  // run physics on object
  this.physics(obj);

  // events
  this.event(obj, "frame");
};

/* Spawns
	---------------------------------------- */

core.prototype.spawn = function(props) {
  // weapon crate contents
  if (props.type == "crate") {
    if (this.crate_list.length < 1) {
      return;
    }
    props.data = this.crate_list[rand(0, this.crate_list.length)];
  }

  // do we have a set position
  if (!props.x && !props.y) {
    var pos = this.map.air_find_spot();
    props.x = pos.x;
    props.y = pos.y;
  }

  return this.create_object(props);
};

/* ========================================================================
    Physics
 ========================================================================== */

/* Run air physics
	---------------------------------------- */

core.prototype.physics = function(obj) {
  // are we still grounded
  if (obj.grounded) {
    if (!this.map.ground_pixel(round(obj.x), round(obj.y))) {
      obj.grounded = false;
    }
  }

  // run the main physics
  if (!obj.grounded) {
    this.physics_gravity(obj);
    this.physics_move(obj);
  }
};

/* Calculate gravity
	---------------------------------------- */

core.prototype.physics_gravity = function(obj) {
  // if no weight
  if (obj.c.weight <= 0) {
    return;
  }

  // get gravity values
  var gravity = this.map.get_gravity(round(obj.x), round(obj.y));

  // adjust speed
  this.physics_adjust_speed(
    obj,
    gravity.x,
    gravity.y,
    obj.c.speed.max_gravity,
    obj.c.weight
  );
};

/* Adjust speed of object
	---------------------------------------- */

core.prototype.physics_adjust_speed = function(
  obj,
  new_speed_x,
  new_speed_y,
  max_speed,
  weight
) {
  var angle = get_angle(new_speed_x, new_speed_y);
  var max_speed = xy_speed(angle, max_speed);
  var speed_add_x = new_speed_x * weight;
  var speed_add_y = new_speed_y * weight;
  var diff_x = max_speed.x - obj.speed_x;
  var diff_y = max_speed.y - obj.speed_y;

  // only add speed up to the limit without bringing it down
  if (max_speed.x < 0) {
    obj.speed_x += max(speed_add_x, min(0, diff_x));
  } else {
    obj.speed_x += min(speed_add_x, max(0, diff_x));
  }
  if (max_speed.y < 0) {
    obj.speed_y += max(speed_add_y, min(0, diff_y));
  } else {
    obj.speed_y += min(speed_add_y, max(0, diff_y));
  }

  obj.speed_x = obj.speed_x.fixed();
  obj.speed_y = obj.speed_y.fixed();
};

/* Do the movement
	---------------------------------------- */

core.prototype.physics_move = function(obj) {
  // check speed
  var speed_limit = check_speed(obj.speed_x, obj.speed_y, obj.c.speed.max);
  obj.speed_x = speed_limit.x.fixed();
  obj.speed_y = speed_limit.y.fixed();

  // plot a course
  var course = plot_course(obj.x, obj.y, obj.speed_x, obj.speed_y);

  // if no course
  if (!course.move) {
    this.collisions(obj, obj.x, obj.y);
    return;
  }

  // move through course
  var moved = false;
  for (var i = 1; i < course.points.length; i++) {
    // remaining movement points left
    obj.speed_left = course.points.length - i;

    var point = course.points[i];
    var nx = this.map.loop_x(round(point.x));
    var ny = this.map.loop_y(round(point.y));

    // collisions
    var collision = this.collisions(obj, nx, ny);
    if (collision) {
      break;
    }

    // move object
    obj.x = nx;
    obj.y = ny;
    moved = true;
  }

  return moved;
};

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

/* ========================================================================
    State management
 ========================================================================== */

/* Get state
	---------------------------------------- */

core.prototype.pack_state = function(state) {
  // players
  var players = [];
  for (var id in state.players) {
    players.push(this.pack_player(state.players[id]));
  }

  // go through objects
  var objects = [];
  for (var key in state.objects) {
    objects.push(this.pack_object(state.objects[key]));
  }

  // go through explosions
  var explosions = [];
  for (key in state.explosions) {
    explosions.push(this.pack_explosion(state.explosions[key]));
  }

  return (
    players.join("#") + "+" + objects.join("#") + "+" + explosions.join("#")
  );
};

/* Set state
	---------------------------------------- */

core.prototype.unpack_state = function(str) {
  // blank state
  var state = this.blank_state();

  // run through state string
  var split = str.split("+");
  for (var i = 0; i < split.length; i++) {
    if (split[i]) {
      var split2 = split[i].split("#");
      for (var j = 0; j < split2.length; j++) {
        if (i == 0) {
          this.unpack_player(state, split2[j]);
        }
        if (i == 1) {
          this.unpack_object(state, split2[j]);
        }
        if (i == 2) {
          this.unpack_explosion(state, split2[j]);
        }
      }
    }
  }

  return state;
};

/* Players
	---------------------------------------- */

core.prototype.pack_player = function(obj) {
  // prep basic values
  var dead = obj.dead ? "1" : "";
  var weapon = this.armoury_refs.indexOf(obj.weapon);

  // prep armoury
  var armoury = [];
  for (var key in obj.armoury) {
    armoury.push(obj.armoury[key]);
  }
  armoury = armoury.join("$");

  // prep events
  var events = [];
  for (var i = 0; i < obj.events.length; i++) {
    var event = obj.events[i];
    if (event.type === "walk") {
      events.push(event.frame + "~0");
    }
    if (event.type === "jump") {
      events.push(event.frame + "~1");
    }
    if (event.type === "shoot") {
      events.push(event.frame + "~2~" + event.obj + "~" + event.weapon);
    }
    if (event.type === "crate") {
      events.push(event.frame + "~3~" + event.obj);
    }
    if (event.type === "medpack") {
      events.push(event.frame + "~4~" + event.obj);
    }
    if (event.type === "gem") {
      events.push(event.frame + "~5~" + event.obj);
    }
  }
  events = events.join("$");

  // return player string
  var arr = [
    obj.id,
    obj.level,
    obj.score,
    dead,
    obj.health,
    obj.cooldown,
    obj.hit,
    obj.locked,
    armoury,
    weapon,
    events
  ];
  return arr.join("/");
};

core.prototype.unpack_player = function(state, str) {
  var split = str.split("/");
  var props = {};
  props.id = parseInt(split[0]);
  props.level = parseInt(split[1]);
  props.score = parseInt(split[2]);
  props.dead = split[3] === "1" ? true : false;
  props.health = parseInt(split[4]);
  props.cooldown = parseInt(split[5]);
  props.hit = parseInt(split[6]);
  props.locked = split[7];

  // prep armoury
  props.armoury = {};
  var split2 = split[8].split("$");
  for (var i = 0; i < split2.length; i++) {
    var key = this.armoury_refs[i];
    props.armoury[key] = parseInt(split2[i]);
  }

  // weapon
  var wep = parseInt(split[9]);
  if (wep !== -1) {
    props.weapon = this.armoury_refs[wep];
  }

  // prep events
  props.events = [];
  var split2 = split[10].split("$");
  for (var i = 0; i < split2.length; i++) {
    var split3 = split2[i].split("~");
    var obj = { frame: parseInt(split3[0]) };
    if (split3[1] === "0") {
      obj.type = "walk";
    }
    if (split3[1] === "1") {
      obj.type = "jump";
    }
    if (split3[1] === "2") {
      obj.type = "shoot";
      obj.obj = split3[2];
      obj.weapon = split3[3];
    }
    if (split3[1] === "3") {
      obj.type = "crate";
      obj.obj = split3[2];
    }
    if (split3[1] === "4") {
      obj.type = "medpack";
      obj.obj = split3[2];
    }
    if (split3[1] === "5") {
      obj.type = "gem";
      obj.obj = split3[2];
    }
    if (obj) {
      props.events.push(obj);
    }
  }

  // make it
  this.create_player(props, state);
};

/* Objects
	---------------------------------------- */

core.prototype.pack_object = function(obj) {
  var grounded = obj.grounded ? "1" : "";
  var arr = [
    obj.type,
    obj.player_id,
    obj.id,
    obj.frame,
    grounded,
    obj.x,
    obj.y,
    obj.speed_x,
    obj.speed_y,
    obj.data
  ];
  return arr.join("/");
};

core.prototype.unpack_object = function(state, str) {
  var split = str.split("/");
  var props = {};
  props.type = split[0];
  props.player_id = parseInt(split[1]);
  props.id = split[2];
  props.frame = parseInt(split[3]);
  props.grounded = split[4] === "1" ? true : false;
  props.x = parseFloat(split[5]);
  props.y = parseFloat(split[6]);
  props.speed_x = parseFloat(split[7]);
  props.speed_y = parseFloat(split[8]);
  props.data = split[9];

  this.create_object(props, state);
};

/* Explosions
	---------------------------------------- */

core.prototype.pack_explosion = function(obj) {
  var arr = [
    obj.player_id,
    obj.frame,
    obj.x,
    obj.y,
    obj.parent,
    obj.parent_type
  ];
  return arr.join("/");
};

core.prototype.unpack_explosion = function(state, str) {
  var split = str.split("/");
  var props = {};
  props.player_id = parseInt(split[0]);
  props.frame = parseInt(split[1]);
  props.x = parseFloat(split[2]);
  props.y = parseFloat(split[3]);
  props.parent = split[4];
  props.parent_type = split[5];

  this.create_explosion(props, state);
};

function isMergeableObject(val) {
  var nonNullObject = val && typeof val === "object";

  return (
    nonNullObject &&
    Object.prototype.toString.call(val) !== "[object RegExp]" &&
    Object.prototype.toString.call(val) !== "[object Date]"
  );
}

function emptyTarget(val) {
  return Array.isArray(val) ? [] : {};
}

function cloneIfNecessary(value, optionsArgument) {
  var clone = optionsArgument && optionsArgument.clone === true;
  return clone && isMergeableObject(value)
    ? deepmerge(emptyTarget(value), value, optionsArgument)
    : value;
}

function defaultArrayMerge(target, source, optionsArgument) {
  var destination = target.slice();
  source.forEach(function(e, i) {
    if (typeof destination[i] === "undefined") {
      destination[i] = cloneIfNecessary(e, optionsArgument);
    } else if (isMergeableObject(e)) {
      destination[i] = deepmerge(target[i], e, optionsArgument);
    } else if (target.indexOf(e) === -1) {
      destination.push(cloneIfNecessary(e, optionsArgument));
    }
  });
  return destination;
}

function mergeObject(target, source, optionsArgument) {
  var destination = {};
  if (isMergeableObject(target)) {
    Object.keys(target).forEach(function(key) {
      destination[key] = cloneIfNecessary(target[key], optionsArgument);
    });
  }
  Object.keys(source).forEach(function(key) {
    if (!isMergeableObject(source[key]) || !target[key]) {
      destination[key] = cloneIfNecessary(source[key], optionsArgument);
    } else {
      destination[key] = deepmerge(target[key], source[key], optionsArgument);
    }
  });
  return destination;
}

function deepmerge(target, source, optionsArgument) {
  var array = Array.isArray(source);
  var options = optionsArgument || { arrayMerge: defaultArrayMerge };
  var arrayMerge = options.arrayMerge || defaultArrayMerge;

  if (array) {
    return Array.isArray(target)
      ? arrayMerge(target, source, optionsArgument)
      : cloneIfNecessary(source, optionsArgument);
  } else {
    return mergeObject(target, source, optionsArgument);
  }
}

deepmerge.all = function deepmergeAll(array, optionsArgument) {
  if (!Array.isArray(array) || array.length < 2) {
    throw new Error(
      "first argument should be an array with at least two elements"
    );
  }

  // we are sure there are at least 2 values, so it is safe to have no initial value
  return array.reduce(function(prev, next) {
    return deepmerge(prev, next, optionsArgument);
  });
};

/* ========================================================================
    Math Functions
 ========================================================================== */

/* Shorten "Math" functions
	---------------------------------------- */

function cos(n) {
  return Math.cos(n);
}
function sin(n) {
  return Math.sin(n);
}
function pow(n) {
  return Math.pow(n);
}
function abs(n) {
  return Math.abs(n);
}
function sqr(n) {
  return Math.pow(n, 2);
}
function sqrt(n) {
  return Math.sqrt(n);
}
function round(n) {
  return Math.round(n);
}
function floor(n) {
  return Math.floor(n);
}
function ceil(n) {
  return Math.ceil(n);
}
function atan2(n1, n2) {
  return Math.atan2(n1, n2);
}
function min(n1, n2) {
  return Math.min(n1, n2);
}
function max(n1, n2) {
  return Math.max(n1, n2);
}
function rand(n1, n2) {
  return floor(Math.random() * n2) + n1;
}
var pi = Math.PI;

/* Fix number to decimal places
	---------------------------------------- */

Number.prototype.fixed = function(n) {
  n = n || 2;
  return parseFloat(this.toFixed(n));
};

/* Add preceding zeroes to number
	---------------------------------------- */

function preceding_zeroes(n, length) {
  var length = length || 2;
  var n = n.toString();
  while (n.length < length) {
    n = "0" + n;
  }
  return n;
}

/* Is number
	---------------------------------------- */

function is_numeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/* Get distance between two points
	---------------------------------------- */

function get_speed(sx, sy) {
  return round(sqrt(sqr(sx) + sqr(sy)));
}

function get_distance(x1, y1, x2, y2) {
  var dx = x2 - x1,
    dy = y2 - y1;
  return get_speed(dx, dy);
}

/* Check speed limit
	---------------------------------------- */

function check_speed(sx, sy, speed) {
  var d = get_distance(0, 0, sx, sy),
    ns = {
      x: sx,
      y: sy,
      total: d
    };
  if (speed < d) {
    var multi = speed / d;
    ns.x = sx * multi;
    ns.y = sy * multi;
    ns.total = speed;
  }
  return ns;
}

/* Get Heading Angle From X and Y Speed
	// 0 = left, 360 = left
	---------------------------------------- */

function get_angle(sx, sy) {
  return (((atan2(sy, sx) * 180) / pi) % 360) + 180;
}

function get_heading(x1, y1, x2, y2) {
  var xs = x2 - x1,
    ys = y2 - y1;
  return get_angle(xs, ys);
}

/* Get X and Y speed from heading and velocity
	---------------------------------------- */

function xy_speed(angle, speed) {
  var a = angle_add(angle, 180),
    r = (a / 180) * pi;
  return {
    x: speed * cos(r),
    y: speed * sin(r)
  };
}

/* Get X and Y offset from heading and velocity
	---------------------------------------- */

function xy_offset(angle, sx, sy) {
  var xy1 = xy_speed(angle, sx);
  var xy2 = xy_speed(angle_add(angle, 90), sy);
  return {
    x: xy1.x + xy2.x,
    y: xy1.y + xy2.y
  };
}

/* Get difference between two numbers in a loop
	---------------------------------------- */

function n_diff(current, target, bottom, top) {
  if (current == target) {
    return 0;
  }

  var scale = abs(top - bottom), // get total size of the loop
    c_current = current - bottom, // correct current for negative numbers
    c_target = target - bottom, // correct target for negative numbers
    n1 = (c_target + scale - c_current) % scale, // get difference when adding
    n2 = (c_current + scale - c_target) % scale; // get difference when subtracting

  // return smallest distance
  if (n1 < n2) {
    return n1;
  } else {
    return -n2;
  }
}

/* Auto loop a number
	---------------------------------------- */

function n_loop(n, bottom, top) {
  var difference = abs(top - bottom);
  while (n <= bottom) {
    n += difference;
  }
  while (n > top) {
    n -= difference;
  }
  return n;
}

/* Add to a number without overflowing up or down from min/max
	---------------------------------------- */

function n_add(n1, n2, t1, t2) {
  var dif = abs(t2 - t1),
    na = n1 + n2;
  while (na < t1) {
    na += dif;
  }
  while (na >= t2) {
    na -= dif;
  }
  return na;
}

/* Add to an angle without overflowing up or down from 0-360
	---------------------------------------- */

function angle_add(angle, add) {
  if (!angle) {
    angle = 0;
  }
  return n_add(angle, add, 0, 360);
}

/* Move number towards a new number with loop
	---------------------------------------- */

function increment_num(current, target, bottom, top, speed) {
  var diff = n_diff(current, target, bottom, top); // get shortest route to number
  move = min(abs(diff) / 10, 4) * speed; // calculate how much to move

  // if difference is less then movement, return target
  if (abs(diff) < move) {
    return target;
  }

  // add or subtract movement
  move = diff < 0 ? -move : move;
  return n_add(current, move, bottom, top);
}

/* Move angle towards a new angle
	---------------------------------------- */

function increment_angle(old_angle, new_angle, speed) {
  return increment_num(old_angle, new_angle, 0, 360, speed);
}

/* If a point is within a circle
	---------------------------------------- */

function in_circle(x, y, cx, cy, radius) {
  return get_distance(x, y, cx, cy) < radius;
}

/* Plot a course
	---------------------------------------- */

function plot_course(x, y, sx, sy, extend) {
  // get initial speed
  var extend = extend ? extend : 0,
    speed = get_speed(sx, sy);

  // if no distance then do nothing
  if (speed == 0) {
    return { move: false };
  }

  // calculate increments
  var increment_x = sx / speed,
    increment_y = sy / speed,
    new_x = x - increment_x * extend,
    new_y = y - increment_y * extend,
    points = [{ x: new_x, y: new_y }];

  // iterate through path and record points
  for (var i = 0; i < speed + extend * 2; i++) {
    (new_x += increment_x), (new_y += increment_y);
    points.push({
      x: new_x,
      y: new_y
    });
  }

  // return point array
  return {
    move: true,
    points: points
  };
}

/* translate co-ordinates by an angle
	---------------------------------------- */

function rotate_coords(x, y, cx, cy, angle) {
  var r = (pi / 180) * angle;
  return {
    x: cos(r) * (x - cx) + sin(r) * (y - cy) + cx,
    y: cos(r) * (y - cy) - sin(r) * (x - cx) + cy
  };
}

/* ========================================================================
    Misc Functions
 ========================================================================== */

/* Duplicate object
	---------------------------------------- */

function duplicate_obj(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* Prevent array merging
	---------------------------------------- */

function dont_merge(destination, source) {
  if (!source) {
    return destination;
  } else {
    return source;
  }
}

/* Add space to a string
	---------------------------------------- */

function str_space(str) {
  var new_str = "";
  for (var i = 0; i < str.length; i++) {
    var add = i == str.length - 1 ? "" : "\u200A";
    new_str += str[i] + add;
  }
  return new_str;
}

/* Log multiple values
	---------------------------------------- */

function clog(
  s1,
  s2,
  s3,
  s4,
  s5,
  s6,
  s7,
  s8,
  s9,
  s10,
  s11,
  s12,
  s13,
  s14,
  s15
) {
  var str = s1;
  if (s2 != undefined) {
    str += " | " + s2;
  }
  if (s3 != undefined) {
    str += " | " + s3;
  }
  if (s4 != undefined) {
    str += " | " + s4;
  }
  if (s5 != undefined) {
    str += " | " + s5;
  }
  if (s6 != undefined) {
    str += " | " + s6;
  }
  if (s7 != undefined) {
    str += " | " + s7;
  }
  if (s8 != undefined) {
    str += " | " + s8;
  }
  if (s9 != undefined) {
    str += " | " + s9;
  }
  if (s10 != undefined) {
    str += " | " + s10;
  }
  if (s11 != undefined) {
    str += " | " + s11;
  }
  if (s12 != undefined) {
    str += " | " + s12;
  }
  if (s13 != undefined) {
    str += " | " + s13;
  }
  if (s14 != undefined) {
    str += " | " + s14;
  }
  if (s15 != undefined) {
    str += " | " + s15;
  }
  console.log(str);
}

var config = config || {};
config.animations = {
  "ant-body-hit": [
    "ant-body-hit-1",
    "ant-body-hit-2",
    "ant-body-hit-1",
    "ant-body-hit-3"
  ],
  "ant-body-still-left": ["ant-body-walk-left-1"],
  "ant-body-still-right": ["ant-body-walk-right-1"],
  "ant-body-walk-left": [
    "ant-body-walk-left-2",
    "ant-body-walk-left-3",
    "ant-body-walk-left-4",
    "ant-body-walk-left-5"
  ],
  "ant-body-walk-right": [
    "ant-body-walk-right-2",
    "ant-body-walk-right-3",
    "ant-body-walk-right-4",
    "ant-body-walk-right-5"
  ],
  "ant-head-left": [
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-1",
    "ant-head-left-2",
    "ant-head-left-3",
    "ant-head-left-2"
  ],
  "ant-head-right": [
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-1",
    "ant-head-right-2",
    "ant-head-right-3",
    "ant-head-right-2"
  ],
  "ant-head-hit": ["ant-head-hit-1", "ant-head-hit-2", "ant-head-hit-3"],
  "ant-weapon-bazooka-left": ["ant-weapon-bazooka-left"],
  "ant-weapon-bazooka-right": ["ant-weapon-bazooka-right"],
  "ant-weapon-laser-left": ["ant-weapon-laser-left"],
  "ant-weapon-laser-right": ["ant-weapon-laser-right"],
  "ant-weapon-throw-left": ["ant-weapon-throw-left-1"],
  "ant-weapon-throw-fire-left": [
    "ant-weapon-throw-left-2",
    "ant-weapon-throw-left-3",
    "ant-weapon-throw-left-4",
    "ant-weapon-throw-left-5",
    "ant-weapon-throw-left-1",
    "ant-weapon-throw-left-1",
    "ant-weapon-throw-left-1",
    "ant-weapon-throw-left-1",
    "ant-weapon-throw-left-1"
  ],
  "ant-weapon-throw-right": ["ant-weapon-throw-right-1"],
  "ant-weapon-throw-fire-right": [
    "ant-weapon-throw-right-2",
    "ant-weapon-throw-right-3",
    "ant-weapon-throw-right-4",
    "ant-weapon-throw-right-5",
    "ant-weapon-throw-right-1",
    "ant-weapon-throw-right-1",
    "ant-weapon-throw-right-1",
    "ant-weapon-throw-right-1",
    "ant-weapon-throw-right-1"
  ],
  "ant-weapon-dig-left": ["ant-weapon-dig-left-1"],
  "ant-weapon-dig-fire-left": [
    "ant-weapon-dig-left-2",
    "ant-weapon-dig-left-3",
    "ant-weapon-dig-left-4"
  ],
  "ant-weapon-dig-right": ["ant-weapon-dig-right-1"],
  "ant-weapon-dig-fire-right": [
    "ant-weapon-dig-right-2",
    "ant-weapon-dig-right-3",
    "ant-weapon-dig-right-4"
  ],
  "ant-ghost": [
    "ant-ghost-1",
    "ant-ghost-1",
    "ant-ghost-2",
    "ant-ghost-2",
    "ant-ghost-3",
    "ant-ghost-3",
    "ant-ghost-2",
    "ant-ghost-2"
  ],
  "bubble-blue": [
    "ball-blue-1",
    "ball-blue-2",
    "ball-blue-3",
    "ball-blue-4",
    "ball-blue-5"
  ],
  "explosion-l": [
    "explosion-l-1",
    "explosion-l-2",
    "explosion-l-3",
    "explosion-l-4",
    "explosion-l-5",
    "explosion-l-6",
    "explosion2-l-5",
    "explosion2-l-6",
    "explosion2-l-7",
    "explosion2-l-8"
  ],
  "explosion2-l": [
    "explosion2-l-1",
    "explosion2-l-2",
    "explosion2-l-3",
    "explosion2-l-4",
    "explosion2-l-5",
    "explosion2-l-6",
    "explosion2-l-7",
    "explosion2-l-8"
  ],
  "explosion-green-l": [
    "explosion-green-l-1",
    "explosion-green-l-2",
    "explosion-green-l-3",
    "explosion-green-l-4",
    "explosion-green-l-5",
    "explosion-green-l-6",
    "explosion-green-l-7",
    "explosion-green-l-8"
  ],
  "explosion-laser-blue": [
    "explosion-laser-blue-1",
    "explosion-laser-blue-2",
    "explosion-laser-blue-3",
    "explosion-laser-blue-4",
    "explosion-laser-blue-5"
  ],
  flame: ["flame-1", "flame-2", "flame-3", "flame-4", "flame-5"],
  "flame-large": [
    "flame-large-1",
    "flame-large-2",
    "flame-large-3",
    "flame-large-4",
    "flame-large-5",
    "flame-large-6"
  ],
  focus: [
    "focus-1",
    "focus-2",
    "focus-3",
    "focus-4",
    "focus-5",
    "focus-6",
    "focus-7",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8",
    "focus-8"
  ],
  "gem-green": [
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-1",
    "gem-green-2",
    "gem-green-3",
    "gem-green-4"
  ],
  "gem-blue": [
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-1",
    "gem-blue-2",
    "gem-blue-3",
    "gem-blue-4"
  ],
  "gem-red": [
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-1",
    "gem-red-2",
    "gem-red-3",
    "gem-red-4"
  ],
  "gem-purple": [
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-1",
    "gem-purple-2",
    "gem-purple-3",
    "gem-purple-4"
  ],
  "gem-silver": [
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-1",
    "gem-silver-2",
    "gem-silver-3",
    "gem-silver-4"
  ],
  "grenade-armed": [
    "grenade-green",
    "grenade-red",
    "grenade-red",
    "grenade-green",
    "grenade-green",
    "grenade-green",
    "grenade-green",
    "grenade-green",
    "grenade-green",
    "grenade-green",
    "grenade-green",
    "grenade-green"
  ],
  "mine-active": [
    "mine-red",
    "mine-red",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey",
    "mine-grey"
  ],
  "smoke-green": [
    "smoke-green-1",
    "smoke-green-2",
    "smoke-green-3",
    "smoke-green-4",
    "smoke-green-5",
    "smoke-green-6",
    "smoke-green-7",
    "smoke-green-8"
  ],
  teleport: [
    "teleport-1",
    "teleport-2",
    "teleport-3",
    "teleport-4",
    "teleport-5",
    "teleport-6",
    "teleport-7"
  ],
  vortex: [
    "vortex-1",
    "vortex-2",
    "vortex-3",
    "vortex-4",
    "vortex-5",
    "vortex-6",
    "vortex-7",
    "vortex-8",
    "vortex-10",
    "vortex-11"
  ]
};

var config = config || {};
config.mapgen = {
  land_type: [
    {
      edge: 1,
      bg: "dirt",
      fg: "rock",
      decorations: {
        "1": [
          {
            x: 432,
            y: 0,
            w: 36,
            h: 72
          },
          {
            x: 468,
            y: 0,
            w: 36,
            h: 72
          },
          {
            x: 504,
            y: 0,
            w: 36,
            h: 72
          },
          {
            x: 540,
            y: 0,
            w: 36,
            h: 72
          },
          {
            x: 576,
            y: 0,
            w: 36,
            h: 72
          }
        ],
        "2": [
          {
            x: 0,
            y: 0,
            w: 72,
            h: 72
          },
          {
            x: 72,
            y: 0,
            w: 72,
            h: 72
          },
          {
            x: 144,
            y: 0,
            w: 72,
            h: 72
          },
          {
            x: 216,
            y: 0,
            w: 72,
            h: 72
          },
          {
            x: 288,
            y: 0,
            w: 72,
            h: 72
          },
          {
            x: 360,
            y: 0,
            w: 72,
            h: 72
          }
        ]
      }
    }
  ]
};

var config = config || {};
config.names = [
  "Dave Lister",
  "Ace Rimmer",
  "Queeg 500",
  "Abradolf Lincler",
  "Beardless Riker",
  "The Ant With No Name",
  "Al Capone",
  "The Queen",
  "Mickey Eyes"
];

var config = config || {};
config.objects = {
  default: {
    size: 1,
    weight: 0,
    bounce: 0.4,
    timeout: 0,
    damage: 30,
    knock: 1,
    spawn: false,
    player_lock: false,
    launch_distance: 2,
    destroy_ground: true,
    stop: 0,
    ignore_level_damage: false,
    events: {
      frame: "",
      ground: "",
      object: "",
      explosion: "",
      die: ""
    },
    object_events: {},
    speed: {
      max_gravity: 30,
      max: 40,
      move: 4,
      jump: 10
    },
    cluster: {
      circle: true,
      object: "grenade",
      speed: 2,
      count: 6
    },
    animation: {
      explosion: "explosion-l",
      sprite: "",
      air_spin: false,
      air_float: false,
      static_angle: false,
      ground: false
    },
    audio: {
      explosion: "explosion",
      bounce: "donk",
      hit: "",
      air: "",
      walk: "walk"
    },
    labels: {
      player_health: false,
      player_name: false,
      timeout: false
    },
    trails: {
      count: 0,
      speed: 0.6,
      offset_x: 0,
      offset_y: 0,
      timeout: 0,
      rotate: false,
      move: true,
      sprite: ""
    }
  },
  player: {
    size: 12,
    weight: 0.7,
    bounce: 0.7,
    events: {
      ground: "player_bounce",
      explosion: "hit_receive"
    },
    object_events: {
      crate: "collect",
      medpack: "collect",
      "gem-1": "collect",
      "gem-5": "collect",
      "gem-20": "collect",
      "gem-50": "collect",
      "gem-200": "collect",
      vortex: "collect"
    },
    animation: {
      sprite: "ant-body",
      air_spin: false,
      ground: false
    },
    audio: {
      bounce: "doink",
      explosion: "pop"
    },
    labels: {
      player_health: true,
      player_name: true
    }
  },
  player_missile: {
    size: 12,
    weight: 0.7,
    damage: 50,
    events: {
      ground: ["bounce_explode", "spawn_ghost"],
      explosion: ["bounce_explode", "spawn_ghost"]
    },
    object_events: {
      player: ["bounce_explode", "spawn_ghost"]
    },
    animation: {
      sprite: "ant-bomb",
      air_spin: true
    },
    labels: {
      player_name: true
    },
    trails: {
      count: 2,
      speed: 0.6,
      timeout: 10,
      sprite: "ball-red"
    }
  },
  player_ghost: {
    size: 12,
    weight: 0,
    damage: 1,
    knock: 0,
    events: {
      object: "hit_receive",
      explosion: "hit_receive"
    },
    object_events: {
      player: "hit_give"
    },
    speed: {
      max: 2.5,
      move: 0.3
    },
    animation: {
      sprite: "ant-ghost",
      air_float: true
    },
    labels: {
      player_name: true
    }
  },
  crate: {
    size: 16,
    spawn: true,
    animation: {
      sprite: "crate-weapon",
      air_float: true
    },
    trails: {
      count: 2,
      speed: 1,
      timeout: 30,
      rotate: false,
      move: true,
      sprite: "ball-blue"
    }
  },
  medpack: {
    size: 16,
    spawn: true,
    animation: {
      sprite: "crate-health",
      air_float: true
    },
    trails: {
      count: 2,
      speed: 1,
      timeout: 30,
      rotate: false,
      move: true,
      sprite: "ball-red"
    }
  },
  "gem-1": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-green",
      static_angle: true,
      air_float: true
    }
  },
  "gem-5": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-blue",
      static_angle: true,
      air_float: true
    }
  },
  "gem-20": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-red",
      static_angle: true,
      air_float: true
    }
  },
  "gem-50": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-purple",
      static_angle: true,
      air_float: true
    }
  },
  "gem-200": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-silver",
      static_angle: true,
      air_float: true
    }
  },
  vortex: {
    size: 22,
    animation: {
      sprite: "vortex"
    }
  },
  target: {
    size: 22,
    damage: 0,
    spawn: true,
    events: {
      object: "die",
      explosion: "die",
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      explosion: "explosion-laser-blue",
      sprite: "target",
      air_float: true
    },
    audio: {
      explosion: "pop",
      air: "none"
    }
  },
  nuclear: {
    size: 22,
    damage: 100,
    spawn: true,
    events: {
      object: "die",
      explosion: "die",
      die: "explode"
    },
    animation: {
      explosion: "explosion-green-l",
      sprite: "nuclear",
      air_float: true
    },
    audio: {
      explosion: "explosion_gas",
      air: "none"
    }
  },
  mine: {
    size: 58,
    damage: 80,
    events: {
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      sprite: "mine",
      air_float: true
    }
  },
  "asteroid-small": {
    size: 15,
    weight: 1,
    damage: 40,
    events: {
      object: "die",
      ground: "die",
      explosion: "die",
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      explosion: "explosion2-l",
      sprite: "asteroid-small",
      air_spin: true
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 2,
      speed: 0.6,
      offset_x: -5,
      timeout: 10,
      sprite: "flame"
    }
  },
  "asteroid-large": {
    size: 34,
    weight: 1,
    damage: 80,
    events: {
      object: "die",
      ground: "die",
      explosion: "die",
      die: "cluster"
    },
    object_events: {
      player: "die"
    },
    cluster: {
      circle: true,
      object: "asteroid-small",
      speed: 16,
      count: 3
    },
    animation: {
      explosion: "explosion2-l",
      sprite: "asteroid-large",
      air_spin: true
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 2,
      speed: 0.6,
      offset_x: -5,
      timeout: 20,
      sprite: "flame"
    }
  },
  dig: {
    size: 2,
    weight: 0,
    damage: 16,
    timeout: 6,
    ignore_level_damage: true,
    events: {
      ground: ["destroy", "drag_player", "die"]
    }
  },
  punch: {
    size: 20,
    weight: 0,
    damage: 16,
    timeout: 24,
    player_lock: true,
    events: {
      ground: "slide"
    },
    object_events: {
      player: "hit_give"
    },
    animation: {
      sprite: "flame-large"
    },
    audio: {
      air: "fly",
      bounce: "doink",
      hit: "punch"
    },
    trails: {
      count: 1,
      speed: 1.5,
      offset_x: -10,
      offset_y: 0,
      timeout: 10,
      rotate: false,
      move: true,
      sprite: "flame"
    }
  },
  laser: {
    size: 24,
    weight: 0,
    timeout: 20,
    damage: 30,
    destroy_ground: false,
    events: {
      ground: "die",
      object: "none",
      die: "none"
    },
    object_events: {
      player: ["explode", "die"],
      player_ghost: ["hit_give", "die"]
    },
    animation: {
      sprite: "laser-blue",
      explosion: "explosion-laser-blue"
    },
    audio: {
      explosion: "explosion_laser"
    },
    trails: {
      count: 1,
      speed: 0,
      timeout: 10,
      rotate: false,
      move: false,
      sprite: "bubble-blue"
    }
  },
  bazooka: {
    size: 6,
    weight: 0.7,
    timeout: 300,
    damage: 70,
    events: {
      ground: "die",
      object: "die",
      explosion: "die",
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      sprite: "bazooka-shell"
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 1,
      speed: 1.5,
      offset_x: -10,
      offset_y: 0,
      timeout: 10,
      rotate: false,
      move: true,
      sprite: "flame"
    }
  },
  grenade: {
    size: 4,
    weight: 0.7,
    timeout: 72,
    damage: 50,
    events: {
      ground: "bounce",
      object: "bounce",
      explosion: "bounce",
      die: "explode"
    },
    object_events: {
      player: "bounce"
    },
    animation: {
      air_spin: true,
      sprite: "grenade-armed"
    },
    labels: {
      timeout: true
    },
    audio: {
      air: "countdown"
    },
    trails: {
      count: 1,
      timeout: 20,
      rotate: false,
      move: true,
      sprite: "ball-green"
    }
  },
  pumpkin: {
    size: 10,
    weight: 1,
    timeout: 72,
    damage: 70,
    events: {
      ground: "bounce",
      object: "bounce",
      explosion: "bounce",
      die: "cluster"
    },
    object_events: {
      player: "bounce"
    },
    animation: {
      air_spin: true,
      sprite: "pumpkin"
    },
    labels: {
      timeout: true
    },
    audio: {
      air: "spooky"
    },
    trails: {
      count: 2,
      timeout: 20,
      rotate: false,
      move: true,
      rotate: true,
      sprite: "bat"
    },
    cluster: {
      circle: false,
      object: "pumpkin_slice",
      speed: 15,
      count: 3
    }
  },
  pumpkin_slice: {
    size: 6,
    weight: 1,
    timeout: 200,
    damage: 30,
    events: {
      ground: "die",
      explosion: "die",
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      air_spin: true,
      sprite: "pumpkin-slice"
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 2,
      timeout: 20,
      rotate: false,
      move: true,
      sprite: "ball-orange"
    }
  },
  paingiver: {
    size: 20,
    weight: 1,
    damage: 50,
    cluster: {
      circle: false,
      object: "grenade",
      speed: 15,
      count: 3
    },
    events: {
      ground: "die",
      die: "cluster"
    },
    object_events: {
      player: "die"
    },
    animation: {
      sprite: "rocket"
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 1,
      timeout: 10,
      rotate: false,
      move: true,
      sprite: "flame"
    }
  }
};

// prep objects
config.object_refs = [];
for (key in config.objects) {
  config.object_refs.push(key);
  config.objects[key] = deepmerge(config.objects.default, config.objects[key], {
    arrayMerge: dont_merge
  });
}

var config = config || {};
config.sprites = {
  "ball-blue": {
    size: 48,
    x: 192,
    y: 1056
  },
  "ball-green": {
    size: 48,
    x: 240,
    y: 1056
  },
  "ball-orange": {
    size: 48,
    x: 288,
    y: 1056
  },
  "ball-red": {
    size: 48,
    x: 336,
    y: 1056
  },
  "ball-silver": {
    size: 48,
    x: 384,
    y: 1056
  },
  bat: {
    size: 48,
    x: 432,
    y: 1056
  },
  "flame-1": {
    size: 48,
    x: 480,
    y: 1056
  },
  "flame-2": {
    size: 48,
    x: 528,
    y: 1056
  },
  "flame-3": {
    size: 48,
    x: 576,
    y: 1056
  },
  "flame-4": {
    size: 48,
    x: 624,
    y: 1056
  },
  "flame-5": {
    size: 48,
    x: 672,
    y: 1056
  },
  "mine-grey": {
    size: 48,
    x: 720,
    y: 1056
  },
  "mine-red": {
    size: 48,
    x: 768,
    y: 1056
  },
  "pumpkin-slice": {
    size: 48,
    x: 816,
    y: 1056
  },
  pumpkin: {
    size: 48,
    x: 864,
    y: 1056
  },
  "star-blue": {
    size: 48,
    x: 912,
    y: 1056
  },
  "ant-body-air-left": {
    size: 48,
    x: 960,
    y: 1056
  },
  "ant-body-air-right": {
    size: 48,
    x: 1008,
    y: 1056
  },
  "ant-body-hit-1": {
    size: 48,
    x: 1056,
    y: 1056
  },
  "ant-body-hit-2": {
    size: 48,
    x: 1120,
    y: 0
  },
  "ant-body-hit-3": {
    size: 48,
    x: 1120,
    y: 48
  },
  "ant-body-superman-left": {
    size: 48,
    x: 1120,
    y: 96
  },
  "ant-body-superman-right": {
    size: 48,
    x: 1120,
    y: 144
  },
  "ant-body-walk-left-1": {
    size: 48,
    x: 1120,
    y: 192
  },
  "ant-body-walk-left-2": {
    size: 48,
    x: 1120,
    y: 240
  },
  "ant-body-walk-left-3": {
    size: 48,
    x: 1120,
    y: 288
  },
  "ant-body-walk-left-4": {
    size: 48,
    x: 1120,
    y: 336
  },
  "ant-body-walk-left-5": {
    size: 48,
    x: 1120,
    y: 384
  },
  "ant-body-walk-right-1": {
    size: 48,
    x: 1120,
    y: 432
  },
  "ant-body-walk-right-2": {
    size: 48,
    x: 1120,
    y: 480
  },
  "ant-body-walk-right-3": {
    size: 48,
    x: 1120,
    y: 528
  },
  "ant-body-walk-right-4": {
    size: 48,
    x: 1120,
    y: 576
  },
  "ant-body-walk-right-5": {
    size: 48,
    x: 1120,
    y: 624
  },
  "ant-bomb": {
    size: 48,
    x: 1120,
    y: 672
  },
  "ant-ghost-1": {
    size: 64,
    x: 576,
    y: 960
  },
  "ant-ghost-2": {
    size: 64,
    x: 640,
    y: 960
  },
  "ant-ghost-3": {
    size: 64,
    x: 704,
    y: 960
  },
  "ant-head-hit-1": {
    size: 64,
    x: 768,
    y: 960
  },
  "ant-head-hit-2": {
    size: 64,
    x: 832,
    y: 960
  },
  "ant-head-hit-3": {
    size: 64,
    x: 896,
    y: 960
  },
  "ant-head-left-1": {
    size: 64,
    x: 960,
    y: 960
  },
  "ant-head-left-2": {
    size: 64,
    x: 1056,
    y: 0
  },
  "ant-head-left-3": {
    size: 64,
    x: 1056,
    y: 64
  },
  "ant-head-right-1": {
    size: 64,
    x: 1056,
    y: 128
  },
  "ant-head-right-2": {
    size: 64,
    x: 1056,
    y: 192
  },
  "ant-head-right-3": {
    size: 64,
    x: 1056,
    y: 256
  },
  "ant-weapon-bazooka-left": {
    size: 64,
    x: 1056,
    y: 320
  },
  "ant-weapon-bazooka-right": {
    size: 64,
    x: 1056,
    y: 384
  },
  "ant-weapon-dig-left-1": {
    size: 64,
    x: 1056,
    y: 448
  },
  "ant-weapon-dig-left-2": {
    size: 64,
    x: 1056,
    y: 512
  },
  "ant-weapon-dig-left-3": {
    size: 64,
    x: 1056,
    y: 576
  },
  "ant-weapon-dig-left-4": {
    size: 64,
    x: 1056,
    y: 640
  },
  "ant-weapon-dig-right-1": {
    size: 64,
    x: 1056,
    y: 704
  },
  "ant-weapon-dig-right-2": {
    size: 64,
    x: 1056,
    y: 768
  },
  "ant-weapon-dig-right-3": {
    size: 64,
    x: 1056,
    y: 832
  },
  "ant-weapon-dig-right-4": {
    size: 64,
    x: 1056,
    y: 896
  },
  "ant-weapon-laser-left": {
    size: 64,
    x: 1056,
    y: 960
  },
  "ant-weapon-laser-right": {
    size: 64,
    x: 0,
    y: 1056
  },
  "ant-weapon-punch-left": {
    size: 64,
    x: 64,
    y: 1056
  },
  "ant-weapon-punch-right": {
    size: 64,
    x: 128,
    y: 1056
  },
  "ant-weapon-throw-left-1": {
    size: 48,
    x: 1120,
    y: 720
  },
  "ant-weapon-throw-left-2": {
    size: 48,
    x: 1120,
    y: 768
  },
  "ant-weapon-throw-left-3": {
    size: 48,
    x: 1120,
    y: 816
  },
  "ant-weapon-throw-left-4": {
    size: 48,
    x: 1120,
    y: 864
  },
  "ant-weapon-throw-left-5": {
    size: 48,
    x: 1120,
    y: 912
  },
  "ant-weapon-throw-right-1": {
    size: 48,
    x: 1120,
    y: 960
  },
  "ant-weapon-throw-right-2": {
    size: 48,
    x: 1120,
    y: 1008
  },
  "ant-weapon-throw-right-3": {
    size: 48,
    x: 1120,
    y: 1056
  },
  "ant-weapon-throw-right-4": {
    size: 48,
    x: 0,
    y: 1120
  },
  "ant-weapon-throw-right-5": {
    size: 48,
    x: 48,
    y: 1120
  },
  "armoury-dig": {
    size: 48,
    x: 96,
    y: 1120
  },
  "armoury-extinguishe": {
    size: 48,
    x: 144,
    y: 1120
  },
  "armoury-laser-blue": {
    size: 48,
    x: 192,
    y: 1120
  },
  "armoury-laser-red": {
    size: 48,
    x: 240,
    y: 1120
  },
  "armoury-punch": {
    size: 48,
    x: 288,
    y: 1120
  },
  "arrow-blue": {
    size: 48,
    x: 336,
    y: 1120
  },
  "arrow-green": {
    size: 48,
    x: 384,
    y: 1120
  },
  "arrow-grey": {
    size: 48,
    x: 432,
    y: 1120
  },
  "arrow-purple": {
    size: 48,
    x: 480,
    y: 1120
  },
  "arrow-red": {
    size: 48,
    x: 528,
    y: 1120
  },
  "asteroid-1": {
    size: 96,
    x: 0,
    y: 768
  },
  "asteroid-2": {
    size: 96,
    x: 96,
    y: 768
  },
  "ball-blue-1": {
    size: 24,
    x: 1056,
    y: 1024
  },
  "ball-blue-2": {
    size: 24,
    x: 1080,
    y: 1024
  },
  "ball-blue-3": {
    size: 24,
    x: 1024,
    y: 960
  },
  "ball-blue-4": {
    size: 24,
    x: 1024,
    y: 984
  },
  "ball-blue-5": {
    size: 24,
    x: 576,
    y: 1024
  },
  "bazooka-shell": {
    size: 48,
    x: 576,
    y: 1120
  },
  "crate-health": {
    size: 48,
    x: 624,
    y: 1120
  },
  "crate-weapon": {
    size: 48,
    x: 672,
    y: 1120
  },
  crosshair: {
    size: 48,
    x: 720,
    y: 1120
  },
  "explosion-green-l-1": {
    size: 192,
    x: 0,
    y: 0
  },
  "explosion-green-l-2": {
    size: 192,
    x: 192,
    y: 0
  },
  "explosion-green-l-3": {
    size: 192,
    x: 0,
    y: 192
  },
  "explosion-green-l-4": {
    size: 192,
    x: 192,
    y: 192
  },
  "explosion-green-l-5": {
    size: 192,
    x: 384,
    y: 0
  },
  "explosion-green-l-6": {
    size: 192,
    x: 384,
    y: 192
  },
  "explosion-green-l-7": {
    size: 192,
    x: 0,
    y: 384
  },
  "explosion-green-l-8": {
    size: 192,
    x: 192,
    y: 384
  },
  "explosion-l-1": {
    size: 192,
    x: 384,
    y: 384
  },
  "explosion-l-2": {
    size: 192,
    x: 576,
    y: 0
  },
  "explosion-l-3": {
    size: 192,
    x: 576,
    y: 192
  },
  "explosion-l-4": {
    size: 192,
    x: 576,
    y: 384
  },
  "explosion-l-5": {
    size: 192,
    x: 0,
    y: 576
  },
  "explosion-l-6": {
    size: 192,
    x: 192,
    y: 576
  },
  "explosion-l-7": {
    size: 192,
    x: 384,
    y: 576
  },
  "explosion-laser-blue-1": {
    size: 96,
    x: 192,
    y: 768
  },
  "explosion-laser-blue-2": {
    size: 96,
    x: 288,
    y: 768
  },
  "explosion-laser-blue-3": {
    size: 96,
    x: 384,
    y: 768
  },
  "explosion-laser-blue-4": {
    size: 96,
    x: 480,
    y: 768
  },
  "explosion-laser-blue-5": {
    size: 96,
    x: 576,
    y: 768
  },
  "explosion2-l-1": {
    size: 96,
    x: 672,
    y: 768
  },
  "explosion2-l-2": {
    size: 96,
    x: 768,
    y: 768
  },
  "explosion2-l-3": {
    size: 96,
    x: 864,
    y: 768
  },
  "explosion2-l-4": {
    size: 192,
    x: 576,
    y: 576
  },
  "explosion2-l-5": {
    size: 192,
    x: 768,
    y: 0
  },
  "explosion2-l-6": {
    size: 192,
    x: 768,
    y: 192
  },
  "explosion2-l-7": {
    size: 192,
    x: 768,
    y: 384
  },
  "explosion2-l-8": {
    size: 192,
    x: 768,
    y: 576
  },
  extinguisher: {
    size: 48,
    x: 768,
    y: 1120
  },
  "flame-large-1": {
    size: 96,
    x: 0,
    y: 864
  },
  "flame-large-2": {
    size: 96,
    x: 96,
    y: 864
  },
  "flame-large-3": {
    size: 96,
    x: 192,
    y: 864
  },
  "flame-large-4": {
    size: 96,
    x: 288,
    y: 864
  },
  "flame-large-5": {
    size: 96,
    x: 384,
    y: 864
  },
  "flame-large-6": {
    size: 96,
    x: 480,
    y: 864
  },
  "focus-1": {
    size: 96,
    x: 576,
    y: 864
  },
  "focus-2": {
    size: 96,
    x: 672,
    y: 864
  },
  "focus-3": {
    size: 96,
    x: 768,
    y: 864
  },
  "focus-4": {
    size: 96,
    x: 864,
    y: 864
  },
  "focus-5": {
    size: 96,
    x: 960,
    y: 0
  },
  "focus-6": {
    size: 96,
    x: 960,
    y: 96
  },
  "focus-7": {
    size: 96,
    x: 960,
    y: 192
  },
  "focus-8": {
    size: 96,
    x: 960,
    y: 288
  },
  "gem-blue-1": {
    size: 48,
    x: 816,
    y: 1120
  },
  "gem-blue-2": {
    size: 48,
    x: 864,
    y: 1120
  },
  "gem-blue-3": {
    size: 48,
    x: 912,
    y: 1120
  },
  "gem-blue-4": {
    size: 48,
    x: 960,
    y: 1120
  },
  "gem-green-1": {
    size: 48,
    x: 1008,
    y: 1120
  },
  "gem-green-2": {
    size: 48,
    x: 1056,
    y: 1120
  },
  "gem-green-3": {
    size: 48,
    x: 1104,
    y: 1120
  },
  "gem-green-4": {
    size: 48,
    x: 1168,
    y: 0
  },
  "gem-purple-1": {
    size: 48,
    x: 1168,
    y: 48
  },
  "gem-purple-2": {
    size: 48,
    x: 1168,
    y: 96
  },
  "gem-purple-3": {
    size: 48,
    x: 1168,
    y: 144
  },
  "gem-purple-4": {
    size: 48,
    x: 1168,
    y: 192
  },
  "gem-red-1": {
    size: 48,
    x: 1168,
    y: 240
  },
  "gem-red-2": {
    size: 48,
    x: 1168,
    y: 288
  },
  "gem-red-3": {
    size: 48,
    x: 1168,
    y: 336
  },
  "gem-red-4": {
    size: 48,
    x: 1168,
    y: 384
  },
  "gem-silver-1": {
    size: 48,
    x: 1168,
    y: 432
  },
  "gem-silver-2": {
    size: 48,
    x: 1168,
    y: 480
  },
  "gem-silver-3": {
    size: 48,
    x: 1168,
    y: 528
  },
  "gem-silver-4": {
    size: 48,
    x: 1168,
    y: 576
  },
  "grenade-green": {
    size: 48,
    x: 1168,
    y: 624
  },
  "grenade-red": {
    size: 48,
    x: 1168,
    y: 672
  },
  "laser-blue": {
    size: 48,
    x: 1168,
    y: 720
  },
  "laser-red": {
    size: 48,
    x: 1168,
    y: 768
  },
  nuclear: {
    size: 96,
    x: 960,
    y: 384
  },
  rocket: {
    size: 48,
    x: 1168,
    y: 816
  },
  smoke: {
    size: 24,
    x: 600,
    y: 1024
  },
  target: {
    size: 48,
    x: 48,
    y: 1168
  },
  "teleport-1": {
    size: 48,
    x: 1168,
    y: 864
  },
  "teleport-2": {
    size: 48,
    x: 1168,
    y: 912
  },
  "teleport-3": {
    size: 48,
    x: 1168,
    y: 960
  },
  "teleport-4": {
    size: 48,
    x: 1168,
    y: 1008
  },
  "teleport-5": {
    size: 48,
    x: 1168,
    y: 1056
  },
  "teleport-6": {
    size: 48,
    x: 1168,
    y: 1104
  },
  "teleport-7": {
    size: 48,
    x: 0,
    y: 1168
  },
  "vortex-1": {
    size: 96,
    x: 960,
    y: 480
  },
  "vortex-10": {
    size: 96,
    x: 960,
    y: 576
  },
  "vortex-11": {
    size: 96,
    x: 960,
    y: 672
  },
  "vortex-2": {
    size: 96,
    x: 960,
    y: 768
  },
  "vortex-3": {
    size: 96,
    x: 960,
    y: 864
  },
  "vortex-4": {
    size: 96,
    x: 0,
    y: 960
  },
  "vortex-5": {
    size: 96,
    x: 96,
    y: 960
  },
  "vortex-6": {
    size: 96,
    x: 192,
    y: 960
  },
  "vortex-7": {
    size: 96,
    x: 288,
    y: 960
  },
  "vortex-8": {
    size: 96,
    x: 384,
    y: 960
  },
  "vortex-9": {
    size: 96,
    x: 480,
    y: 960
  }
};

var config = config || {};
config.weapons = {
  default: {
    title: "",
    armoury_sprite: "",
    sprite: "",
    fire_audio: "",
    fire_sprite: "",
    fire_body_sprite: "",
    fire_angle_lock: false,
    auto_follow: false,
    require_walk: false,
    speed: 0,
    object: "",
    cooldown: 0,
    recoil: 0,
    inertia: 0
  },
  dig: {
    title: "Dig",
    armoury_sprite: "armoury-dig",
    sprite: "dig",
    fire_sprite: "dig-fire",
    fire_body_sprite: "walk",
    fire_angle_lock: true,
    speed: 3,
    object: "dig",
    cooldown: 10
  },
  phaser: {
    title: "Phaser",
    armoury_sprite: "armoury-laser-blue",
    sprite: "laser",
    fire_audio: "shoot_laser",
    speed: 30,
    object: "laser",
    cooldown: 6,
    recoil: 0.1,
    inertia: 0.5
  },
  bazookoid: {
    title: "Bazookoid",
    armoury_sprite: "bazooka-shell",
    sprite: "bazooka",
    fire_audio: "shoot",
    speed: 24,
    object: "bazooka",
    cooldown: 15,
    recoil: 0.2,
    inertia: 0.5
  },
  grenade: {
    title: "Grenade",
    armoury_sprite: "grenade-green",
    sprite: "throw",
    fire_audio: "throw",
    fire_sprite: "throw-fire",
    speed: 24,
    object: "grenade",
    cooldown: 15,
    recoil: 0,
    inertia: 0.5
  },
  punch: {
    title: "Fire Punch",
    armoury_sprite: "armoury-punch",
    sprite: "punch",
    fire_audio: "throw",
    fire_body_sprite: "superman",
    speed: 16,
    object: "punch",
    cooldown: 60,
    recoil: 0,
    inertia: 0.5
  },
  pumpkin: {
    title: "Pumpkin",
    armoury_sprite: "pumpkin",
    sprite: "throw",
    fire_audio: "throw",
    fire_sprite: "throw-fire",
    speed: 15,
    object: "pumpkin",
    cooldown: 48,
    recoil: 0,
    inertia: 0.5
  },
  paingiver: {
    title: "Paingiver 2000",
    armoury_sprite: "rocket",
    sprite: "bazooka",
    fire_audio: "shoot",
    speed: 24,
    object: "paingiver",
    cooldown: 10,
    recoil: 0.4,
    inertia: 0.5
  }
};

// prep weapons
for (key in config.weapons) {
  config.weapons[key] = deepmerge(config.weapons.default, config.weapons[key], {
    arrayMerge: dont_merge
  });
}

var schemes = schemes || {};
schemes.deathmatch = {
  title: "Deathmatch",
  time_limit: 0,
  destroy_land: true,
  gravity: 2,
  score: true,
  drops: {
    crate: {
      time: 100,
      max: 1
    },
    medpack: {
      time: 100,
      add: 30,
      max: 1
    },
    "gem-1": {
      time: 100,
      max: 5
    },
    "gem-5": {
      time: 150,
      max: 1
    },
    "gem-20": {
      time: 500,
      max: 1
    }
  },
  weapons: {
    phaser: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    bazookoid: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    grenade: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    punch: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    dig: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    pumpkin: {
      start_count: 5,
      crate_chance: 1,
      crate_count: 5
    },
    paingiver: {
      start_count: 20,
      crate_chance: 1,
      crate_count: 5
    }
  },
  mapgen: {
    type: "random",
    src: "",
    gap: 20,
    w: 1900,
    h: 1400,
    blobs: [],
    decorations: true,
    small_blobs: 5,
    large_blobs: 3
  },
  events: {
    frame: {},
    collect: {},
    destroy: {},
    timeout: {},
    destroy_obj_type: {},
    destroy_obj_player: {}
  }
};

var schemes = schemes || {};
schemes.default = {
  title: "",
  description: "",
  time_limit: 0,
  show_time: false,
  destroy_land: true,
  gravity_type: "land",
  gravity: 1,
  stars: {},
  score: false,
  health: true,
  levels: {
    score: [
      0,
      10,
      25,
      40,
      60,
      90,
      120,
      150,
      200,
      250,
      300,
      360,
      420,
      490,
      570,
      650,
      720,
      810,
      900,
      1000
    ],
    health: [
      500,
      520,
      520,
      520,
      540,
      540,
      540,
      540,
      560,
      580,
      600,
      600,
      600,
      600,
      620,
      620,
      620,
      620,
      640,
      1000
    ],
    damage: [
      0,
      10,
      10,
      15,
      15,
      15,
      15,
      20,
      20,
      25,
      25,
      25,
      30,
      30,
      30,
      30,
      35,
      35,
      35,
      50
    ],
    speed: [
      4,
      6,
      8,
      8,
      8,
      8,
      10,
      10,
      10,
      12,
      12,
      12,
      12,
      14,
      14,
      14,
      14,
      16,
      16,
      20
    ],
    jump: [
      10,
      12,
      12,
      12,
      12,
      15,
      15,
      15,
      15,
      18,
      18,
      20,
      20,
      20,
      20,
      20,
      20,
      20,
      20,
      25
    ]
  },
  drops: {
    crate: {
      time: 0,
      max: 20
    },
    medpack: {
      time: 0,
      add: 30,
      max: 50
    },
    nuclear: {
      time: 0,
      max: 20
    },
    target: {
      time: 0,
      max: 100
    },
    asteroid_center: {
      time: 0,
      increase_frequency: false,
      max: 30
    },
    "gem-1": {
      time: 0,
      max: 20
    }
  },
  weapons: {
    phaser: {
      start_count: 0,
      crate_chance: 0,
      crate_count: -1
    },
    bazookoid: {
      start_count: 0,
      crate_chance: 0,
      crate_count: -1
    },
    grenade: {
      start_count: 0,
      crate_chance: 0,
      crate_count: -1
    },
    punch: {
      start_count: 0,
      crate_chance: 0,
      crate_count: -1
    },
    dig: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    pumpkin: {
      start_count: 0,
      crate_chance: 0,
      crate_count: 1
    },
    paingiver: {
      start_count: 0,
      crate_chance: 0,
      crate_count: 10
    }
  },
  armoury: [
    "phaser",
    "bazookoid",
    "grenade",
    "punch",
    "dig",
    "pumpkin",
    "paingiver"
  ],
  arrows: {
    nuclear: "green",
    player: "red",
    target: "blue",
    "asteroid-small": "grey",
    "asteroid-large": "grey",
    vortex: "purple",
    crate: "blue"
  },
  spawn: [],
  mapgen: {
    type: "random",
    src: "",
    gap: 20,
    w: 1000,
    h: 1000,
    blobs: [],
    decorations: true,
    small_blobs: 5,
    large_blobs: 3
  },
  events: {
    frame: {},
    collect: {},
    destroy: {},
    timeout: {},
    destroy_obj_type: {},
    destroy_obj_player: {}
  }
};

/* ========================================================================
	Map Generator
	Blobs
 ========================================================================== */

/* Draw a blob
	---------------------------------------- */

function mapgen_blob(img, config, decorations, radius, type) {
  this.size = 36;
  this.img = img;
  this.c = config;

  // get land type
  var type = type || Math.floor(Math.random() * this.c.land_type.length);
  this.ref = this.c.land_type[type];

  // set up main anchor points
  var anchors = [];
  var points = Math.floor(radius / 2) + 4;
  var spike = Math.floor(radius / 2) + 2;
  for (var p = 0; p < points; p++) {
    var new_radius =
      Math.max(radius - Math.floor(Math.random() * spike), 1) + 1;
    var x =
      radius + Math.floor(new_radius * Math.cos((2 * Math.PI * p) / points));
    var y =
      radius + Math.floor(new_radius * Math.sin((2 * Math.PI * p) / points));
    anchors.push({ x: x, y: y });
  }

  // draw shape to canvas
  var size = radius * 2 + 1;
  var shape = mapgen_canvas(size, size);
  this.draw_path(shape, anchors);

  // build array of land or not tiles
  var pixels = shape.cont.getImageData(0, 0, shape.w, shape.h);
  this.land = [];
  for (var y = 0; y < size; y++) {
    this.land[y] = [];
    for (var x = 0; x < size; x++) {
      var i = (y * size + x) * 4 + 3;
      this.land[y][x] = pixels.data[i] > 30 ? 1 : 0;
    }
  }

  // build tile array and assign corners and land
  this.tiles = [];
  for (var y = 0; y < size; y++) {
    this.tiles[y] = [];
    for (var x = 0; x < size; x++) {
      this.tiles[y][x] = this.set_corner_tile(y, x);
    }
  }

  // assign pixels a tile value
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      this.tiles[y][x] =
        this.tiles[y][x] === 12 ? this.set_land_tile(y, x) : this.tiles[y][x];
    }
  }

  // draw them
  var wh = (size + 4) * this.size;
  this.alpha = mapgen_canvas(wh, wh);
  this.edge = mapgen_canvas(wh, wh);
  this.bg = mapgen_canvas(wh, wh);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var tile = this.tiles[y][x];
      if (tile === -1) {
        continue;
      }

      // draw it
      var x1 = (x + 2) * this.size;
      var y1 = (y + 2) * this.size;
      this.draw_to_canvas(this.alpha.cont, x1, y1, tile, 0);
      this.draw_to_canvas(this.edge.cont, x1, y1, tile, this.ref.edge);

      if (decorations) {
        this.draw_decoration(this.bg.cont, x, y, tile);
      }
    }
  }

  // draw rest of fg
  var fg = mapgen_pattern(this.alpha.canv, this.img[this.ref.fg]);
  fg.cont.drawImage(this.edge.canv, 0, 0);

  // draw dirt bg
  var fg_dirt = mapgen_pattern(fg.canv, this.img[this.ref.bg]);
  this.bg.cont.drawImage(fg_dirt.canv, 0, 0);

  // export
  return {
    fg: fg,
    bg: this.bg
  };
}

/* Draw an alpha path
	---------------------------------------- */

mapgen_blob.prototype.draw_path = function(canv, path) {
  // start paths on canvases
  canv.cont.beginPath();
  canv.cont.moveTo(path[0].x, path[0].y);

  // go through path
  for (var i = 1; i < path.length - 1; i++) {
    // get next point to curve around
    var point1 = path[i],
      point2 = path[i + 1],
      qx,
      qy;

    // get curve values
    if (i < path.length - 1) {
      qx = (point1.x + point2.x) / 2;
      qy = (point1.y + point2.y) / 2;
    } else {
      qx = point2.x;
      qy = point2.y;
    }

    // draw curve to path
    canv.cont.quadraticCurveTo(point1.x, point1.y, qx, qy);
  }

  // rejoin the beginning of the path and fill
  canv.cont.lineTo(path[0].x, path[0].y);
  canv.cont.fill();
};

/* Draw a decoration
	---------------------------------------- */

mapgen_blob.prototype.draw_decoration = function(cont, x, y, tile) {
  // are we drawing one
  if (tile > 7 || Math.floor(Math.random() * 2) !== 0) {
    return;
  }

  // can we do doubles
  var double = false;
  if (tile === 0 && this.is_type(y, x + 1, 0)) {
    double = true;
  }
  if (tile === 1 && this.is_type(y, x - 1, 1)) {
    double = true;
  }
  if (tile === 2 && this.is_type(y - 1, x, 2)) {
    double = true;
  }
  if (tile === 3 && this.is_type(y + 1, x, 3)) {
    double = true;
  }
  if (tile === 4 && this.is_type(y - 1, x + 1, 4)) {
    double = true;
  }
  if (tile === 5 && this.is_type(y + 1, x + 1, 5)) {
    double = true;
  }
  if (tile === 6 && this.is_type(y - 1, x - 1, 6)) {
    double = true;
  }
  if (tile === 7 && this.is_type(y + 1, x - 1, 7)) {
    double = true;
  }

  // choose source
  var source = this.ref.decorations[1];
  if (double && Math.floor(Math.random() * 2) === 0) {
    source = this.ref.decorations[2];
  } else {
    double = false;
  }

  // choose decoration
  var i = Math.floor(Math.random() * source.length);
  var ref = source[i];

  // get position to draw it
  var half = this.size / 2;
  var x1 = (x + 2) * this.size;
  var y1 = (y + 2) * this.size;
  var angle = 0;
  if (tile === 1) {
    x1 += this.size;
    y1 += this.size;
    angle = 180;
  }
  if (tile === 2) {
    y1 += this.size;
    angle = 270;
  }
  if (tile === 3) {
    x1 += this.size;
    angle = 90;
  }
  if (tile === 4) {
    y1 += this.size;
    angle = 315;
  }
  if (tile === 5) {
    angle = 45;
  }
  if (tile === 6) {
    x1 += this.size;
    y1 += this.size;
    angle = 225;
  }
  if (tile === 7) {
    x1 += this.size;
    angle = 135;
  }

  // draw that shit
  var x_add = double ? this.size : 0;
  cont.save();
  cont.translate(x1, y1);
  cont.rotate((angle * Math.PI) / 180);
  cont.drawImage(
    this.img.decorations,
    ref.x,
    ref.y,
    ref.w,
    ref.h,
    0,
    -ref.h + 5,
    ref.w,
    ref.h
  );
  cont.translate(-x1, -y1);
  cont.restore();
};

/* Draw a tile to a canvas
	---------------------------------------- */

mapgen_blob.prototype.draw_to_canvas = function(cont, x, y, tile, key) {
  var ts = this.size;
  cont.save();
  cont.translate(x, y);
  cont.drawImage(this.img.edge, tile * ts, key * ts, ts, ts, 0, 0, ts, ts);
  cont.translate(-y, -y);
  cont.restore();
};

/* Get corner and land tiles
	---------------------------------------- */

mapgen_blob.prototype.set_corner_tile = function(y, x) {
  var tile = -1;

  //land
  if (this.is_land(y, x)) {
    tile = 12;

    // not land
  } else {
    // corners
    if (
      !this.is_land(y - 1, x) &&
      !this.is_land(y, x - 1) &&
      this.is_land(y + 1, x) &&
      this.is_land(y, x + 1)
    ) {
      tile = 4;
    } else if (
      !this.is_land(y - 1, x) &&
      this.is_land(y, x - 1) &&
      this.is_land(y + 1, x) &&
      !this.is_land(y, x + 1)
    ) {
      tile = 5;
    } else if (
      this.is_land(y - 1, x) &&
      !this.is_land(y, x - 1) &&
      !this.is_land(y + 1, x) &&
      this.is_land(y, x + 1)
    ) {
      tile = 6;
    } else if (
      this.is_land(y - 1, x) &&
      this.is_land(y, x - 1) &&
      !this.is_land(y + 1, x) &&
      !this.is_land(y, x + 1)
    ) {
      tile = 7;
    }
  }

  return tile;
};

/* Set land tile types
	---------------------------------------- */

mapgen_blob.prototype.set_land_tile = function(y, x) {
  var tile = 12;

  // corners
  if (
    !this.is_land(y - 1, x) &&
    !this.is_land(y, x - 1) &&
    this.is_land_or_corner(y + 1, x) &&
    this.is_land_or_corner(y, x + 1) &&
    !this.is_corner(y, x - 1) &&
    !this.is_corner(y - 1, x)
  ) {
    tile = 4;
  } else if (
    !this.is_land(y - 1, x) &&
    !this.is_land(y, x + 1) &&
    this.is_land_or_corner(y, x - 1) &&
    this.is_land_or_corner(y + 1, x) &&
    !this.is_corner(y, x + 1) &&
    !this.is_corner(y - 1, x)
  ) {
    tile = 5;
  } else if (
    !this.is_land(y, x - 1) &&
    !this.is_land(y + 1, x) &&
    this.is_land_or_corner(y - 1, x) &&
    this.is_land_or_corner(y, x + 1) &&
    !this.is_corner(y, x - 1) &&
    !this.is_corner(y + 1, x)
  ) {
    tile = 6;
  } else if (
    !this.is_land(y + 1, x) &&
    !this.is_land(y, x + 1) &&
    this.is_land_or_corner(y - 1, x) &&
    this.is_land_or_corner(y, x - 1) &&
    !this.is_corner(y, x + 1) &&
    !this.is_corner(y + 1, x)
  ) {
    tile = 7;

    // flat edges
  } else if (
    !this.is_land(y - 1, x) &&
    this.is_land(y + 1, x) &&
    !this.is_corner(y - 1, x)
  ) {
    tile = 0;
  } else if (
    !this.is_land(y + 1, x) &&
    this.is_land(y - 1, x) &&
    !this.is_corner(y + 1, x)
  ) {
    tile = 1;
  } else if (
    !this.is_land(y, x - 1) &&
    this.is_land(y, x + 1) &&
    !this.is_corner(y, x - 1)
  ) {
    tile = 2;
  } else if (
    !this.is_land(y, x + 1) &&
    this.is_land(y, x - 1) &&
    !this.is_corner(y, x + 1)
  ) {
    tile = 3;

    // inside corners
  } else if (this.is_type(y + 1, x, 7) || this.is_type(y, x + 1, 7)) {
    tile = 8;
  } else if (this.is_type(y + 1, x, 6) || this.is_type(y, x - 1, 6)) {
    tile = 9;
  } else if (this.is_type(y - 1, x, 5) || this.is_type(y, x + 1, 5)) {
    tile = 10;
  } else if (this.is_type(y - 1, x, 4) || this.is_type(y, x - 1, 4)) {
    tile = 11;
  }

  return tile;
};

/* Check arrays for values
	---------------------------------------- */

mapgen_blob.prototype.is_land_or_corner = function(y, x) {
  if (this.is_corner(y, x) || this.is_land(y, x)) {
    return true;
  }
};

mapgen_blob.prototype.is_corner = function(y, x) {
  return this.check_arr(this.tiles, y, x, [4, 5, 6, 7]);
};

mapgen_blob.prototype.is_type = function(y, x, type) {
  return this.check_arr(this.tiles, y, x, [type]);
};

mapgen_blob.prototype.is_land = function(y, x) {
  return this.check_arr(this.land, y, x, [1]);
};

mapgen_blob.prototype.check_arr = function(arr, y, x, checks) {
  if (y < 0 || y >= arr.length || x < 0 || x >= arr[0].length) {
    return false;
  }
  for (var i = 0; i < checks.length; i++) {
    if (arr[y][x] == checks[i]) {
      return true;
    }
  }
};

/* ========================================================================
	Map Generator
	Make Canvas
 ========================================================================== */

/* Set up a new canvas
	---------------------------------------- */

function mapgen_canvas(w, h) {
  var obj = {};
  if ("undefined" != typeof global) {
    obj.canv = new canvas();
  } else {
    obj.canv = document.createElement("canvas");
  }
  obj.cont = obj.canv.getContext("2d");
  obj.canv.width = w;
  obj.canv.height = h;
  obj.cont.fillStyle = "#fff";
  obj.w = w;
  obj.h = h;
  return obj;
}

/* Draw a pattern to a canvas
	---------------------------------------- */

function mapgen_pattern(alpha, pattern) {
  var canv = mapgen_canvas(alpha.width, alpha.height);
  if (typeof pattern !== "string") {
    pattern = canv.cont.createPattern(pattern, "repeat");
  }
  canv.cont.fillStyle = pattern;
  canv.cont.fillRect(0, 0, alpha.width, alpha.height);
  canv.cont.globalCompositeOperation = "destination-in";
  canv.cont.drawImage(alpha, 0, 0);
  canv.cont.globalCompositeOperation = "normal";

  return canv;
}

/* ========================================================================
	Map Generator
	------------
	Config:
	w           // width of map
	h           // height of map
	crust       // thickness of outer crust on land
	blobs       // initial blobs
	center_blob // size of center blob of land, 0 for none
	small_blobs // number of random small circles of land
	large_blobs // number of random large circles of land
	-----------
 ========================================================================== */

/* Server side only
	---------------------------------------- */

if ("undefined" != typeof global) {
  var fs = require("fs");
}

/* New Map Generation
	---------------------------------------- */

function mapgen(img, config, scheme, map_img) {
  this.size = 36;
  this.img = img;
  this.c = config;
  this.scheme = scheme;

  // choose type
  if (this.scheme.type == "random") {
    return this.draw_random();
  }
  if (this.scheme.type == "image") {
    return this.draw_image(map_img);
  }
}

/* Draw image
	---------------------------------------- */

mapgen.prototype.draw_image = function(map_img) {
  var fg = mapgen_canvas(
    map_img.width + this.scheme.gap * 2,
    map_img.height + this.scheme.gap * 2
  );
  fg.cont.drawImage(map_img, this.scheme.gap, this.scheme.gap);
  var bg = mapgen_pattern(fg.canv, this.img.dirt);
  return { fg: fg, bg: bg };
};

/* Draw random
	---------------------------------------- */

mapgen.prototype.draw_random = function() {
  // setup
  this.blobs = JSON.parse(JSON.stringify(this.scheme.blobs));
  this.bg = mapgen_canvas(this.scheme.w, this.scheme.h);
  this.fg = mapgen_canvas(this.scheme.w, this.scheme.h);

  // generate some random large circles
  for (var i = 0; i < this.scheme.large_blobs; i++) {
    this.blobs = this.get_circle(this.blobs, 4, 6);
  }

  // generate some random small circles
  for (var i = 0; i < this.scheme.small_blobs; i++) {
    this.blobs = this.get_circle(this.blobs, 1, 3);
  }

  // go through each blob
  for (var i = 0; i < this.blobs.length; i++) {
    var blob = this.blobs[i];

    // create the blobs
    var bg = new mapgen_blob(this.img, this.c, false, blob.r + 4, blob.type);
    var fg = new mapgen_blob(
      this.img,
      this.c,
      this.scheme.decorations,
      blob.r,
      blob.type
    );

    // combine the backgrounds
    var wh = fg.fg.canv.width;
    var new_bg = mapgen_canvas(wh, wh);
    new_bg.cont.drawImage(bg.fg.canv, wh * 0.1, wh * 0.1, wh * 0.8, wh * 0.8);
    new_bg.cont.globalCompositeOperation = "source-atop";
    new_bg.cont.fillStyle = "rgba(0,0,0,0.8)";
    new_bg.cont.fillRect(0, 0, wh, wh);
    new_bg.cont.globalCompositeOperation = "normal";
    new_bg.cont.drawImage(fg.bg.canv, 0, 0);

    // draw it to main canvas
    this.bg.cont.drawImage(new_bg.canv, blob.x - wh / 2, blob.y - wh / 2);
    this.fg.cont.drawImage(fg.fg.canv, blob.x - wh / 2, blob.y - wh / 2);
  }

  // return it
  return {
    bg: this.bg,
    fg: this.fg
  };
};

/* Get a far away circle
	---------------------------------------- */

mapgen.prototype.get_circle = function(arr, min_radius, max_radius) {
  // generate many circles and find furthest away
  var distance = 0;
  var circle = null;

  for (var i = 0; i < 20; i++) {
    // make new circle
    var test_circle = this.circle(min_radius, max_radius);
    var smallest_distance = 999999;

    // find shortest distance from all other circles
    for (var j = 0; j < arr.length; j++) {
      var dx = arr[j].x - test_circle.x;
      var dy = arr[j].y - test_circle.y;
      var test_distance = Math.round(
        Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))
      );
      smallest_distance =
        test_distance < smallest_distance ? test_distance : smallest_distance;
    }

    // if is the largest distance record this as furthest
    if (distance < smallest_distance) {
      distance = smallest_distance;
      circle = test_circle;
    }
  }

  // add furthest away circle to new array
  arr.push(circle);
  return arr;
};

/* Generate a random circle
	---------------------------------------- */

mapgen.prototype.circle = function(min_radius, max_radius) {
  var r = Math.floor(Math.random() * max_radius) + min_radius;
  var gap = (r + 2) * this.size + this.scheme.gap;
  var x = Math.floor(Math.random() * (this.scheme.w - gap * 2)) + gap;
  var y = Math.floor(Math.random() * (this.scheme.h - gap * 2)) + gap;
  return {
    r: r,
    x: x,
    y: y
  };
};

/* ========================================================================
	Map Gravity
 ========================================================================== */

/* Set up gravity
	----------------------------------------- */

core_map.prototype.init_gravity = function(gravity_map) {
  this.weight = this.scheme.gravity || 1;
  this.gravity_type = this.scheme.gravity_type || "land";

  if (this.scheme.gravity_type !== "land") {
    return;
  }

  // set values
  this.gravity = {
    w: 0,
    h: 0,
    map: [],
    scale: 24,
    reach: 18
  };

  if (gravity_map) {
    this.gravity.map = JSON.parse(gravity_map);
    this.gravity.w = this.gravity.map[0].length;
    this.gravity.h = this.gravity.map.length;
  } else {
    this.init_gravity_map();
  }
};

/* Generate gravity map
	---------------------------------------- */

core_map.prototype.init_gravity_map = function() {
  // set size of new gravity grid
  this.gravity.w = ceil(this.w / this.gravity.scale);
  this.gravity.h = ceil(this.h / this.gravity.scale);

  // generate map array
  var new_arr = [];
  for (var y = 0; y < this.gravity.h; y++) {
    this.gravity.map[y] = [];
    for (var x = 0; x < this.gravity.w; x++) {
      this.gravity.map[y].push([0, 0, 0]);
    }
  }

  // do the calculating
  this.action_gravity_generate(0, 0, this.w, this.h);
};

/* Apply new gravity calculations to a set of pixels
	---------------------------------------- */

core_map.prototype.action_gravity_generate = function(x, y, w, h) {
  // calculate which tiles are affected
  var x1 = max(0, min(floor(x / this.gravity.scale), this.gravity.w));
  var y1 = max(0, min(floor(y / this.gravity.scale), this.gravity.h));
  var x2 = max(0, min(floor((x + w) / this.gravity.scale), this.gravity.w));
  var y2 = max(0, min(floor((y + h) / this.gravity.scale), this.gravity.h));

  // get the weight of all affected tiles
  for (var y3 = y1; y3 < y2; y3++) {
    for (var x3 = x1; x3 < x2; x3++) {
      this.gravity.map[y3][x3][0] = this.get_tile_weight(x3, y3);
    }
  }

  // calculate surrounding tiles
  var x1 = max(0, min(x1 - this.gravity.reach, this.gravity.w));
  var y1 = max(0, min(y1 - this.gravity.reach, this.gravity.h));
  var x2 = max(0, min(x2 + this.gravity.reach, this.gravity.w));
  var y2 = max(0, min(y2 + this.gravity.reach, this.gravity.h));

  // go through surrounding tiles to get gravity
  for (var y3 = y1; y3 < y2; y3++) {
    for (var x3 = x1; x3 < x2; x3++) {
      var xy = this.get_tile_gravity(x3, y3);
      this.gravity.map[y3][x3][1] = xy.x;
      this.gravity.map[y3][x3][2] = xy.y;
    }
  }
};

/* Get weight of a tile in the gravity map
	---------------------------------------- */

core_map.prototype.get_tile_weight = function(x, y) {
  // limit x and y to within the area
  var y1 = max(0, min(y * this.gravity.scale, this.h));
  var x1 = max(0, min(x * this.gravity.scale, this.w));
  var y2 = max(0, min(y * this.gravity.scale + this.gravity.scale, this.h));
  var x2 = max(0, min(x * this.gravity.scale + this.gravity.scale, this.w));

  // go through the grid of pixels
  var c = 0;
  for (var y3 = y1; y3 < y2; y3++) {
    for (var x3 = x1; x3 < x2; x3++) {
      var id = this.i(x3, y3);
      if (id == 1 || id == 2) {
        c += 1;
      }
      if (id == 3) {
        c += 3;
      }
    }
  }
  return c;
};

/* Get gravity of a tile from the weight of surrounding tiles
	---------------------------------------- */

core_map.prototype.get_tile_gravity = function(x, y) {
  // calculate surrounding tiles
  var wx = 0;
  var wy = 0;
  var x1 = max(0, min(x - this.gravity.reach, this.gravity.w));
  var y1 = max(0, min(y - this.gravity.reach, this.gravity.h));
  var x2 = max(0, min(x + this.gravity.reach, this.gravity.w));
  var y2 = max(0, min(y + this.gravity.reach, this.gravity.h));

  // go through surrounding tiles to get gravity
  for (var y3 = y1; y3 < y2; y3++) {
    for (var x3 = x1; x3 < x2; x3++) {
      wx += (x3 - x) * this.gravity.map[y3][x3][0];
      wy += (y3 - y) * this.gravity.map[y3][x3][0];
    }
  }

  wx = round(wx / 5000 / this.gravity.reach) / 60;
  wy = round(wy / 5000 / this.gravity.reach) / 60;

  return {
    x: wx,
    y: wy
  };
};

/* Reset gravity from destruction event
	---------------------------------------- */

core_map.prototype.gravity_event_recalculate = function(x, y, radius) {
  // if we are not using land gravity
  if (this.scheme.gravity_type !== "land") {
    return;
  }

  // recalculate gravity
  var x1 = round(x - radius);
  var y1 = round(y - radius);
  var size = round(radius * 2 + 1);
  this.action_gravity_generate(x1, y1, size, size);
};

/* Return gravity for co-ordinates
	---------------------------------------- */

core_map.prototype.get_gravity = function(x, y) {
  // flat
  if (this.scheme.gravity_type === "flat") {
    return { x: 0, y: this.weight };
  }

  // map
  if (this.scheme.gravity_type === "land") {
    var x1 = max(0, min(round(x / this.gravity.scale), this.gravity.w - 1));
    var y1 = max(0, min(round(y / this.gravity.scale), this.gravity.h - 1));
    var obj = this.gravity.map[y1][x1];
    return {
      x: min(obj[1], 1) * this.weight,
      y: min(obj[2], 1) * this.weight
    };
  }
};

/* Return the angle of gravity for co-ordinates
	---------------------------------------- */

core_map.prototype.get_gravity_angle = function(x, y) {
  var grav = this.get_gravity(x, y);
  var a1 = get_angle(grav.x, grav.y);
  return a1;
};

/* ========================================================================
	Map Ground Checkers
 ========================================================================== */

/* Get array of offsets to check in an angles direction
	---------------------------------------- */

core_map.prototype.get_angle_offsets = function(a) {
  if (a > 22 && a <= 67) {
    return [
      [-1, -1],
      [0, -1],
      [-1, 0],
      [1, -1],
      [-1, 1],
      [1, 0],
      [0, 1]
    ];
  } // up left
  if (a > 67 && a <= 112) {
    return [
      [0, -1],
      [-1, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [1, 1]
    ];
  } // up
  if (a > 112 && a <= 157) {
    return [
      [1, -1],
      [0, -1],
      [1, 0],
      [-1, -1],
      [1, 1],
      [-1, 0],
      [0, 1]
    ];
  } // up right
  if (a > 157 && a <= 202) {
    return [
      [1, 0],
      [1, -1],
      [1, 1],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1]
    ];
  } // right
  if (a > 202 && a <= 247) {
    return [
      [1, 1],
      [1, 0],
      [0, 1],
      [1, -1],
      [-1, 1],
      [0, -1],
      [-1, 0]
    ];
  } // down right
  if (a > 247 && a <= 292) {
    return [
      [0, 1],
      [-1, 1],
      [1, 1],
      [-1, 0],
      [1, 0],
      [-1, -1],
      [1, -1]
    ];
  } // down
  if (a > 292 && a <= 337) {
    return [
      [-1, 1],
      [-1, 0],
      [0, 1],
      [-1, -1],
      [1, 1],
      [0, -1],
      [1, 0]
    ];
  } // down left
  if (a > 337 || a <= 22) {
    return [
      [-1, 0],
      [-1, -1],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 1]
    ];
  } // left
};

/* Calculate walk path by angle
	---------------------------------------- */

core_map.prototype.walk = function(x, y, px, py, angle, speed) {
  // get neighboring pixels
  var offsets = this.get_angle_offsets(angle);

  // record old position
  var ox = x;
  var oy = y;

  // record result
  var result = {
    move: false, // we are moving
    angle: 0, // actual angle of movement
    path: [] // recorded coordinates
  };

  // go through number of movements per frame
  for (var i = 0; i < speed; i++) {
    var moved = false;

    // go through directional pixels to check based on angle of path
    for (var j = 0; j < offsets.length; j++) {
      // co-ordinates we're checking
      var x1 = x + offsets[j][0];
      var y1 = y + offsets[j][1];

      // if is previous location, land or not an edge
      if ((x1 == px && y1 == py) || !this.ground_pixel(x1, y1)) {
        continue;
      }

      // set new position
      px = x;
      py = y;
      x = x1;
      y = y1;
      result.move = true;
      result.angle = get_heading(ox, oy, x, y);
      result.path.push({ x: x1, y: y1 });

      var moved = true;
      break;
    }

    // if movement failed
    if (!moved) {
      break;
    }
  }

  // set direction left or right
  result.direction = this.ground_dir(ox, oy, x, y);

  return result;
};

/* Check a pixel is next to ground
	---------------------------------------- */

core_map.prototype.ground_pixel = function(x, y) {
  // if we have hit ground
  if (this.i(x, y)) {
    return false;
  }

  var trigger = false,
    off = [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [1, 1],
      [1, -1]
    ];

  for (var i = 0; i < off.length; i++) {
    // go through offsets
    var x1 = x + off[i][0]; // new x coordinate
    var y1 = y + off[i][1]; // new y coordinate
    if (this.i(x1, y1)) {
      // if pixel is land
      trigger = true; // we did it
      break;
    }
  }

  return trigger;
};

/* Calculate left or right movement
	//
	// calculates direction of land from a line of movement
	// 1. rotate line coords 90 degrees
	// 2. if the top part of the new line has more land then we are moving right
	// 3. if the bottom part we are moving left
	// 4. bananas, all of it
	---------------------------------------- */

core_map.prototype.ground_dir = function(x1, y1, x2, y2) {
  // rotate co-ordinated 90 degrees to point into the ground we're on
  var center_x = x1 + (x2 - x1) / 2;
  var center_y = y1 + (y2 - y1) / 2;
  var rotated_1 = rotate_coords(x1, y1, center_x, center_y, 90);
  var rotated_2 = rotate_coords(x2, y2, center_x, center_y, 90);

  // plot a course of co-ordinates to check
  var speed_x = this.get_distance_x(rotated_1.x, rotated_2.x);
  var speed_y = this.get_distance_y(rotated_1.y, rotated_2.y);
  var plotted = plot_course(rotated_1.x, rotated_1.y, speed_x, speed_y, 8);
  if (!plotted.move) {
    return "right";
  }

  // go through course and count which side has more land on it
  var count_left = 0,
    count_right = 0;
  for (var i = 0; i < plotted.points.length; i++) {
    var point = plotted.points[i];
    if (this.i(round(point.x), round(point.y))) {
      if (i < plotted.points.length / 2) {
        count_right++;
      } else {
        count_left++;
      }
    }
  }
  return count_left > count_right ? "left" : "right";
};

/* Set values in a circle in the ground array
	---------------------------------------- */

core_map.prototype.set_circle = function(x, y, radius, type) {
  // get boundaries
  var x1 = max(round(x - radius), 0);
  var x2 = min(round(x + radius), this.w - 1);
  var y1 = max(round(y - radius), 0);
  var y2 = min(round(y + radius), this.h - 1);

  // loop through co-ordinates
  for (var ly = y1; ly <= y2; ly++) {
    for (var lx = x1; lx <= x2; lx++) {
      if (in_circle(lx, ly, x, y, radius)) {
        this.i_set(lx, ly, type);
      }
    }
  }
};

/* Set block of cells from arr
	---------------------------------------- */

core_map.prototype.set_block_from_arr = function(x, y, arr) {
  for (var ly = 0; ly < arr.length; ly++) {
    for (var lx = 0; lx < arr[ly].length; lx++) {
      this.i_set(x + lx, y + ly, arr[ly][lx]);
    }
  }
};

/* Get block of cells
	---------------------------------------- */

core_map.prototype.get_block = function(x, y, w, h) {
  var response = [];

  // loop through co-ordinates
  for (var ly = 0; ly < h; ly++) {
    response[ly] = [];
    for (var lx = 0; lx < w; lx++) {
      response[ly][lx] = this.i(lx + x, ly + y);
    }
  }

  return response;
};

/* Find nearby ground spot
	---------------------------------------- */

core_map.prototype.find_ground_nearby = function(x, y) {
  var x1 = round(x);
  var y1 = round(y);

  // already on ground
  if (this.ground_pixel(x1, y1)) {
    return { x: x1, y: y1 };
  }

  var spiral_1 = 0;
  var spiral_2 = 1;
  var inc = 1;
  var dir = true;

  for (var i = 0; i < 450; i++) {
    x1 += dir ? inc : 0;
    y1 += !dir ? inc : 0;
    spiral_1++;
    if (spiral_1 == spiral_2) {
      spiral_1 = 0;
      if ((dir = !dir)) {
        inc = inc == 1 ? -1 : 1;
        spiral_2++;
      }
    }

    // check point for ground pixels
    if (this.ground_pixel(x1, y1)) {
      return { x: x1, y: y1 };
    }
  }
  return false;
};

/* Get random empty spot
	---------------------------------------- */

core_map.prototype.air_find_spot = function() {
  var limit = 500;
  var n = 0;

  while (n < limit) {
    var x = rand(0, this.w),
      y = rand(0, this.h),
      id = this.i(x, y);

    // if air pixel
    if (id == 0) {
      return { x: x, y: y };
    }

    // count up
    n++;
  }

  // failed to find a spot
  return false;
};

/* Get random spot next to land;
	---------------------------------------- */

core_map.prototype.next_to_land = function() {
  const start = rand(0, this.arr.length - 1);
  for (let i = 0; i < this.arr.length; i++) {
    const actualIndex = n_loop(start + i, 0, this.arr.length - 1);
    const y = floor(actualIndex / this.w);
    const x = actualIndex - y * this.w;
    if (this.ground_pixel(x, y)) {
      return { x: x, y: y };
    }
  }
  return false; // failed
};

/* Get random ground spot
	---------------------------------------- */

core_map.prototype.ground_find_spot = function() {
  var limit = 500;
  var n = 0;

  while (n < limit) {
    var x = rand(0, this.w),
      y = rand(0, this.h),
      id = this.i(x, y);

    // if not land pixel
    if (id !== 1 && id !== 2) {
      continue;
    }

    // plot course to random angle
    var angle = rand(0, 360);
    for (var i = 0; i < 100; i++) {}

    // count up
    n++;
  }

  // failed to find a spot
  return false;
};

/* ========================================================================
    Map
 ========================================================================== */

// create map object
function core_map(canv, scheme, gravity_map) {
  // Server side only
  if ("undefined" != typeof global) {
    var canvas = require("canvas");
  }

  this.scheme = scheme;

  // set dimensions
  this.w = canv.canv.width;
  this.h = canv.canv.height;

  // get pixels
  var pixels = canv.cont.getImageData(0, 0, this.w, this.h);
  var length = Math.floor(pixels.data.length / 4);

  // create 8 bit alpha array
  // 0. air
  // 1. destructible land
  // 2. indestructible land
  // 3. sun
  this.arr = new Int8Array(length);
  for (var i = 0; i < length; i++) {
    if (pixels.data[i * 4 + 3] > 30) {
      this.arr[i] = 1;
    }
  }

  // set up gravity
  this.init_gravity(gravity_map);
}

/* Get and set array co-ordinate values
	---------------------------------------- */

core_map.prototype.i_get = function(x, y) {
  var x2 = this.loop_x(x);
  var y2 = this.loop_y(y);
  return y2 * this.w + x2;
};

core_map.prototype.i = function(x, y) {
  var i = this.i_get(x, y);
  if (i == null) {
    return 0;
  } else {
    return this.arr[i];
  }
};

core_map.prototype.i_set = function(x, y, val) {
  var i = this.i_get(x, y);
  if (i) {
    this.arr[i] = val;
  }
};

/* Get distance between two points in looping area
	---------------------------------------- */

core_map.prototype.get_distance = function(x1, y1, x2, y2) {
  var x = this.get_distance_x(x1, x2);
  var y = this.get_distance_y(y1, y2);
  return get_speed(x, y);
};

core_map.prototype.get_distance_x = function(x1, x2) {
  return n_diff(x1, x2, 0, this.w);
};
core_map.prototype.get_distance_y = function(y1, y2) {
  return n_diff(y1, y2, 0, this.h);
};

/* Get heading between two points in looping area
	---------------------------------------- */

core_map.prototype.get_heading = function(x1, y1, x2, y2) {
  var x = n_diff(x1, x2, 0, this.w);
  var y = n_diff(y1, y2, 0, this.h);
  return get_angle(x, y);
};

/* Get looping co-ordinate
	---------------------------------------- */

core_map.prototype.loop_x = function(x) {
  return n_loop(x, 0, this.w - 1);
};

core_map.prototype.loop_y = function(y) {
  return n_loop(y, 0, this.h - 1);
};

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

/* ========================================================================
    Server
    Frames
 ========================================================================== */

/* Start/stop loop
    ---------------------------------------- */

room.prototype.loop_start = function() {
  // close any open loops
  this.loop_stop();
  this.frames = 0;

  // set start time to calculate frames from
  this.start_time = new Date().getTime();

  var self = this;
  this.interval = setInterval(function() {
    self.run_tick();
  }, 10);
};

room.prototype.loop_stop = function() {
  clearInterval(this.interval);
};

/* Run tick
    ---------------------------------------- */

room.prototype.run_tick = function() {
  // calculate number of frames since game start
  var now = new Date().getTime();
  var frames = Math.floor((now - this.start_time) / this.ms_loop);

  // get number of remaining steps
  if (this.frames > frames) {
    this.frames = frames;
  }
  var frame_difference = frames - this.frames;

  // waiting
  if (frame_difference < this.tick_frames) {
    return;
  }

  // too much lag
  if (frame_difference > 12) {
    this.loop_start();
    // console.log("resync | " + frame_difference);
    return;
  }

  // reset core
  this.core.state.events = [];

  // find oldest input frame we have to revert to and remove any too old
  var oldest_frame = this.frames;
  var restoring = false;
  for (var user_id in this.players) {
    var actions = this.players[user_id].actions;
    for (var frame in actions) {
      var frame_int = parseInt(frame);
      if (frame_int + 20 < this.frames) {
        delete actions[frame];
        continue;
      }
      if (!actions[frame].done && frame_int < oldest_frame) {
        restoring = true;
        oldest_frame = frame_int;
      }
    }
  }
  frame_difference = frames - oldest_frame;

  // restore state of game if we have one
  var state = this.states[oldest_frame - 1];
  if (restoring && state) {
    this.core.state = this.core.unpack_state(state);
  } else {
    oldest_frame = this.frames;
  }

  // remove players from core
  for (var player_id in this.core.state.players) {
    if (!this.player_ids[parseInt(player_id)]) {
      // console.log("removed player | " + player_id);
      this.remove_core_player(player_id);
    }
  }

  // add players to the core
  for (var user_id in this.players) {
    var player_id = this.players[user_id].player_id;
    if (!this.core.state.players[player_id]) {
      // console.log("added player | " + player_id);
      this.start_core_player(player_id);
    }
  }

  // execute remaining frames
  for (var i = 0; i < frame_difference; i++) {
    this.frame_run(oldest_frame + i);
  }

  // send out response
  this.send_packets(this.states[this.frames]);

  // remove old states
  for (var frame in this.states) {
    if (parseInt(frame) + 20 < frames) {
      delete this.states[frame];
    }
  }

  // remove old drop positions
  for (var key in this.drop_positions) {
    if (this.drop_positions[key].frame + 20 < frames) {
      delete this.drop_positions[key];
    }
  }

  // remove player responses
  for (var id in this.players) {
    this.players[id].responses = [];
  }

  // remove player events
  for (var id in this.core.state.players) {
    this.core.state.players[id].events = [];
  }

  // increment frame count
  this.frames = frames;
};

/* Frame run
    ---------------------------------------- */

room.prototype.frame_run = function(frame) {
  // end the game
  if (this.scheme.time_limit && this.frames >= this.scheme.time_limit) {
    this.end_game();
    return;
  }

  // set core frame
  this.core.state.frame = frame;

  // do drops
  var counts = this.object_counts();
  for (var type in this.scheme.drops) {
    var time = this.scheme.drops[type].time;
    if (time < 1 || counts[type] >= this.scheme.drops[type].max) {
      continue;
    }
    if (frame % time === 0) {
      var props = { type: type };
      var key = frame + "-" + type;
      if (this.drop_positions[key]) {
        props.x = this.drop_positions[key].x;
        props.y = this.drop_positions[key].y;
      }
      var obj = this.core.spawn(props);
      this.drop_positions[key] = { x: obj.x, y: obj.y, frame: frame };
    }
  }

  // run player input
  for (var id in this.players) {
    var player = this.players[id];
    var event = player.actions[frame];
    if (!event) {
      continue;
    }
    player.responses.push(this.core.action(player.player_id, event));
    player.actions[frame].done = true;
  }

  // run core
  this.core.frame();

  // events from scheme
  var f_event = this.scheme.events.frame[frame];
  if (f_event) {
    this.run_event(f_event);
  }

  // run events
  this.run_event(this.core.state.events);

  // get game state
  this.states[frame] = this.core.pack_state(this.core.state);
};

/* Object counts
    ---------------------------------------- */

room.prototype.object_counts = function() {
  var counts = {};
  for (var key in this.core.state.objects) {
    var obj = this.core.state.objects[key];
    if (!counts[obj.type]) {
      counts[obj.type] = 0;
    }
    counts[obj.type]++;
  }
  return counts;
};

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

/* ========================================================================
    Room
 ========================================================================== */

/* Start room
    ---------------------------------------- */

function room() {
  var self = this;
  this.status = "loading";
  this.lag = 0;

  // set constants
  this.max_players = PLAYER_LIMIT;
  this.min_players = 1;
  this.between_game_time = 5000;

  // loop
  this.fps = 24;
  this.ms_loop = Math.floor(1000 / this.fps);
  this.tick_frames = 6;

  // active values
  this.watcher_count = 0;
  this.watchers = {};
  this.player_count = 0;
  this.players = {};
  this.player_ids = new Array(this.max_players).fill(null);

  // start working messages
  this.init_messages();

  // get config files
  this.c = config;

  // load images
  const images = {
    edge: "/images/sprites/edge.png",
    decorations: "/images/sprites/decorations.png",
    dirt: "/images/textures/dirt.png",
    rock: "/images/textures/rock.png"
  };
  let loaded = 0;
  const imgCount = Object.keys(images).length;

  // go through all images and load
  this.img = {};
  for (key in images) {
    const newImg = new canvas.Image();
    newImg.onload = function() {
      loaded++;
      if (loaded >= imgCount) {
        self.loaded();
      }
    };
    newImg.src = __dirname + "/assets" + images[key];
    this.img[key] = newImg;
  }
}

/* Images all loaded
    ---------------------------------------- */

room.prototype.loaded = function() {
  // set scheme
  this.scheme = deepmerge(schemes.default, schemes[SCHEME], {
    arrayMerge: dont_merge
  });

  // wait for game
  this.status = "waiting";

  // try to start
  this.start_game_try();
};

/* Start game if there are enough players
    ---------------------------------------- */

room.prototype.start_game_try = function() {
  if (this.status === "loading" || this.status === "active") {
    return;
  }
  if (this.player_count >= this.min_players) {
    this.start_game();
  } else {
    this.wait_game();
  }
};

/* Reset game and start loading new map
    ---------------------------------------- */

room.prototype.start_game = function() {
  // reset game
  this.frames = 0;
  this.drops = {};

  // load map image if there is one
  if (this.scheme.mapgen.type == "random") {
    this.start_game_loaded();
  } else if (this.scheme.mapgen.type == "image") {
    var self = this;
    var img = new canvas.Image();
    img.onload = function() {
      self.start_game_loaded(this);
    };
    img.src = __dirname + "/" + this.scheme.mapgen.src;
  }
};

/* Start the new game once map is loaded
    ---------------------------------------- */

room.prototype.start_game_loaded = function(map_img) {
  // get the map
  this.map = new mapgen(this.img, this.c.mapgen, this.scheme.mapgen, map_img);
  this.map.fg.cont.globalCompositeOperation = "destination-out";

  // create core
  this.core = new core(this.c, this.scheme, this.map.fg);
  this.core.state = this.core.blank_state();
  this.gravity_map = JSON.stringify(this.core.map.gravity.map);

  // reset state
  this.frames = 0;
  this.states = {};
  this.events = {};
  this.drop_positions = {};
  this.damaged_ground_all = {};
  this.damaged_ground_send = {};

  // start players
  for (var user_id in this.players) {
    var player = this.players[user_id];
    player.actions = {};
    this.start_core_player(player.player_id, player.state);
  }

  // send message to all players with game data
  var fg_str = this.map.fg.canv.toDataURL();
  this.bg_str = this.map.bg.canv.toDataURL();
  this.message_all_players("game_start", [
    1,
    this.bg_str,
    fg_str,
    this.gravity_map
  ]);

  // send message to all watchers
  for (var user_id in this.watchers) {
    this.message_send(this.watchers[user_id], "game_start", [
      1,
      this.bg_str,
      fg_str,
      this.gravity_map
    ]);
  }

  // start the game
  this.status = "active";
  this.loop_start();
};

/* Emd the game
    ---------------------------------------- */

room.prototype.end_game = function(player_left) {
  this.loop_stop();
  this.status = "ended";

  // get all player states
  for (user_id in this.players) {
    var player = this.players[user_id];
    var core_player = this.core.state.players[player.player_id];
    if (!core_player) {
      continue;
    }
    player.state = {
      id: core_player.id,
      level: core_player.level,
      score: core_player.score,
      health: core_player.health,
      dead: core_player.dead,
      weapon: core_player.weapon,
      armoury: duplicate_obj(core_player.armoury)
    };
  }

  // send message to players
  if (player_left) {
    this.message_all_players("opponent_lost", []);
  } else {
    this.message_all_players("game_end");
  }

  this.start_game_try();
};

/* Wait game
    ---------------------------------------- */

room.prototype.wait_game = function() {
  this.message_all_players("game_wait", []);
  this.status = "waiting";
};

/* Send game state from a frame to a player
    ---------------------------------------- */

room.prototype.send_packets = function(state) {
  // prep damaged ground
  var damages = [];
  for (var key in this.damaged_ground_send) {
    var damage = this.damaged_ground_send[key];
    var dig = damage.dig ? "1" : "";
    var arr = [damage.frame, damage.x, damage.y, damage.radius, dig];
    damages.push(arr.join("~"));
  }
  damages = damages.join("$");
  this.damaged_ground_send = {};

  // send it to players
  for (user_id in this.players) {
    // prep action responses
    var responses = [];
    for (var i = 0; i < this.players[user_id].responses.length; i++) {
      var r = this.players[user_id].responses[i];
      var success = r.success ? "1" : "";
      var arr = [r.frame, success, r.x, r.y, r.speed_x, r.speed_y, r.type];
      responses.push(arr.join("~"));
    }
    responses = responses.join("$");

    // send it
    this.message_send(this.players[user_id], "game_state", [
      this.frames,
      state,
      responses,
      damages
    ]);
  }

  // send it to watchers
  for (user_id in this.watchers) {
    this.message_send(this.watchers[user_id], "game_state", [
      this.frames,
      state,
      [],
      damages
    ]);
  }
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

// env variables
const PARENT_PORT = parseInt(process.env.PARENT_PORT || 3000);
const PORT = parseInt(process.env.PORT || 15000);
const DOMAIN = process.env.DOMAIN || "http://localhost";
const PLAYER_LIMIT = process.env.PLAYER_LIMIT || 1;
const SCHEME = process.env.SCHEME || "deathmatch";
const DISABLE_ASSET_PORT = String(process.env.DISABLE_ASSET_PORT) === "true";
const SINGLE = String(process.env.SINGLE) === "true";
const assetPort = DISABLE_ASSET_PORT ? "" : ":" + PARENT_PORT;
const ASSETS = DOMAIN + assetPort + "/assets";

// imports
var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var canvas = require("canvas");
var deepmerge = require("deepmerge");
var uuid = require("node-uuid");

// start the room
const roomInstance = new room();

// check in with parent process
if (!SINGLE) {
  setInterval(() => {
    if (room) {
      process.send({ type: "health" });
    }
  }, 5000);
}

// update parent process with player count
function sendPlayers() {
  if (!SINGLE) {
    process.send({ type: "players", count: roomInstance.player_count });
  }
}

// request handler
server.listen(PORT);
app.get("/", (request, response) => {
  response.set("Content-Type", "text/html");
  response.send(`
<!doctype html>
<html>
<head>
<meta name="viewport" content="minimal-ui, user-scalable=no, initial-scale=0.7, maximum-scale=0.7, width=device-width">
<meta name="description" content="Hand made browser action game">
<meta property="og:description" content="Hand made browser action game">
<meta name="keywords" content="projectants, ants, game, games, web game, html5, fun, flash">
<meta property="og:type" content="website">
<meta property="og:title" content="Project Ants">
<meta property="og:url" content="http://ryanantonydunn.github.io/project-ants/">
<meta property="og:site_name" content="http://ryanantonydunn.github.io/project-ants/">
<meta property="og:image" content="${ASSETS}/images/fbthumb.jpg">
<link rel="image_src" href="${ASSETS}/images/fbthumb.jpg">
<link rel="icon" href="${ASSETS}/images/favicon.png?v=1">
<link rel="stylesheet" type="text/css" href="${ASSETS}/css/style.css">
</head>
<body>
<script src="${DOMAIN + ":" + PORT}/socket.io/socket.io.js"></script>
<script>const PORT=${PORT};const ASSETS="${ASSETS}";const DOMAIN="${DOMAIN}";</script>
<script src="${ASSETS}/js/app.js"></script>
</body>
</html>
`);
});

app.get("/*", (request, response) => {
  const search = request.params[0];
  const path = __dirname + "/" + search;
  response.sendFile(path);
});

// sockets
io.sockets.on("connection", client => {
  client.user_id = uuid();
  client.on("message", message => {
    if (roomInstance) {
      roomInstance.message_receive(client, message);
    }
  });
  client.on("disconnect", () => {
    if (roomInstance) {
      roomInstance.player_leave(client);
    }
  });
});
io.set("heartbeat timeout", 6000);
io.set("heartbeat interval", 5000);

// inform parent that we have initialised
if (!SINGLE) {
  process.send({ type: "init", success: true });
}
console.log("server instance started", DOMAIN, PORT);
