/* ========================================================================
    Game
    Map Graphics
 ========================================================================== */

/* Set up the map canvases
	---------------------------------------- */

game.prototype.init_map = function() {
  this.map.fg.cont.globalCompositeOperation = "destination-out";
};

/* Draw the map
	---------------------------------------- */

game.prototype.draw_map = function() {
  var x = this.canvas.cx - this.camera.x + this.camera.sx;
  var y = this.canvas.cy - this.camera.y + this.camera.sy;

  // draw layers
  this.draw_repeating_layer(this.map.bg.canv, x, y);
  this.draw_repeating_layer(this.map.fg.canv, x, y);
};

/* Draw layer canvas repeating on all sides
	---------------------------------------- */

game.prototype.draw_repeating_layer = function(canv, x, y) {
  this.canvas.cont.drawImage(canv, x - canv.width, y - canv.height);
  this.canvas.cont.drawImage(canv, x, y - canv.height);
  this.canvas.cont.drawImage(canv, x + canv.width, y - canv.height);
  this.canvas.cont.drawImage(canv, x - canv.width, y);
  this.canvas.cont.drawImage(canv, x + canv.width, y);
  this.canvas.cont.drawImage(canv, x - canv.width, y + canv.height);
  this.canvas.cont.drawImage(canv, x, y + canv.height);
  this.canvas.cont.drawImage(canv, x + canv.width, y + canv.height);
  this.canvas.cont.drawImage(canv, x, y);
};

/* Destroy land on the map
	---------------------------------------- */

game.prototype.destroy_land = function(x, y, size) {
  this.map.fg.cont.beginPath();
  this.map.fg.cont.arc(x, y, size, 0, 2 * pi);
  this.map.fg.cont.fill();
};

/* Get a piece of land
	---------------------------------------- */

game.prototype.get_land_block = function(x, y, w, h) {
  var canv = element({ type: "canvas" });
  var cont = canv.getContext("2d");
  canv.width = w;
  canv.height = h;
  cont.drawImage(this.map.fg.canv, x, y, w, h, 0, 0, w, h);

  return canv;
};

/* Draw piece of land
	---------------------------------------- */

game.prototype.draw_land_block = function(x, y, canv) {
  this.map.fg.cont.globalCompositeOperation = "normal";
  this.map.fg.cont.drawImage(canv, x, y);
  this.map.fg.cont.globalCompositeOperation = "destination-out";
};
