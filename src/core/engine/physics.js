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
