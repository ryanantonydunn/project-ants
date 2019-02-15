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
