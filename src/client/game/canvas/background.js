/* ========================================================================
    Game
    Background Layer
 ========================================================================== */

/* Set up background
    ---------------------------------------- */

game.prototype.init_background = function() {
  this.bg = {};
  this.bg.parallax = 0.5;
  this.bg.x = 0;
  this.bg.y = 0;
  this.bg.w = this.img.bg.width;
  this.bg.h = this.img.bg.height;
  this.bg.pattern = this.canvas.cont.createPattern(this.img.bg, "repeat");
};

/* Draw the background
	---------------------------------------- */

game.prototype.draw_background = function() {
  // how much have we moved by
  var dx =
      this.core.map.get_distance_x(this.camera.x, this.camera.px) *
      this.bg.parallax,
    dy =
      this.core.map.get_distance_y(this.camera.y, this.camera.py) *
      this.bg.parallax;

  // add movement multiplied by parallax degree
  this.bg.x = n_loop(this.bg.x + dx, 0, this.bg.w);
  this.bg.y = n_loop(this.bg.y + dy, 0, this.bg.h);

  // draw it
  var size = max(this.canvas.h, this.canvas.w);
  this.canvas.cont.translate(
    this.bg.x + this.camera.sx,
    this.bg.y + this.camera.sy
  );
  this.canvas.cont.fillStyle = this.bg.pattern;
  this.canvas.cont.fillRect(-size, -size, size * 3, size * 3);
  this.canvas.cont.translate(
    -(this.bg.x + this.camera.sx),
    -(this.bg.y + this.camera.sy)
  );
};
