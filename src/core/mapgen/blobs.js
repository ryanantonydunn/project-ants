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
