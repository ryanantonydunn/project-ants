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
