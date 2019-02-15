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
