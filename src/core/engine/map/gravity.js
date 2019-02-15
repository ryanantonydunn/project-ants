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
