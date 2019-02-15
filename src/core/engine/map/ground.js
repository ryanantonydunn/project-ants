/* ========================================================================
	Map Ground Checkers
 ========================================================================== */

/* Get array of offsets to check in an angles direction
	---------------------------------------- */

core_map.prototype.get_angle_offsets = function(a) {
  if (a > 22 && a <= 67) {
    return [[-1, -1], [0, -1], [-1, 0], [1, -1], [-1, 1], [1, 0], [0, 1]];
  } // up left
  if (a > 67 && a <= 112) {
    return [[0, -1], [-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]];
  } // up
  if (a > 112 && a <= 157) {
    return [[1, -1], [0, -1], [1, 0], [-1, -1], [1, 1], [-1, 0], [0, 1]];
  } // up right
  if (a > 157 && a <= 202) {
    return [[1, 0], [1, -1], [1, 1], [0, -1], [0, 1], [-1, -1], [-1, 1]];
  } // right
  if (a > 202 && a <= 247) {
    return [[1, 1], [1, 0], [0, 1], [1, -1], [-1, 1], [0, -1], [-1, 0]];
  } // down right
  if (a > 247 && a <= 292) {
    return [[0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]];
  } // down
  if (a > 292 && a <= 337) {
    return [[-1, 1], [-1, 0], [0, 1], [-1, -1], [1, 1], [0, -1], [1, 0]];
  } // down left
  if (a > 337 || a <= 22) {
    return [[-1, 0], [-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1]];
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
