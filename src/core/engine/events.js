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
