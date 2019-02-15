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
