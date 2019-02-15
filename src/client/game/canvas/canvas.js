/* ========================================================================
    Game
    Main Canvas
 ========================================================================== */

/* Set up canvas
    ---------------------------------------- */

game.prototype.init_canvas = function() {
  // set up main canvas dimensions and position
  var d = select("projectants");
  this.canvas = {};

  // limit game size
  this.canvas.w = d.offsetWidth;
  this.canvas.h = d.offsetHeight;
  if (this.canvas.h < 800) {
    this.canvas.w = round(this.canvas.w * (800 / this.canvas.h));
    this.canvas.h = round(this.canvas.h * (800 / this.canvas.h));
  }
  if (this.canvas.h > 1000) {
    this.canvas.w = round(this.canvas.w * (1000 / this.canvas.h));
    this.canvas.h = round(this.canvas.h * (1000 / this.canvas.h));
  }
  this.canvas.cx = round(this.canvas.w / 2);
  this.canvas.cy = round(this.canvas.h / 2);

  // initialise main canvas
  this.canvas.canv = element({ type: "canvas" });
  this.canvas.canv.style.position = "relative";
  this.canvas.cont = this.canvas.canv.getContext("2d");
  this.canvas.canv.width = this.canvas.w;
  this.canvas.canv.height = this.canvas.h;

  append(this.div, this.canvas.canv);
};

/* Frame rendering
    ---------------------------------------- */

game.prototype.run_canvas = function() {
  // clear the canvas
  this.canvas.cont.clearRect(0, 0, this.w, this.h);

  // do the drawing
  this.draw_background();
  this.draw_map();
  this.draw_sprites();
  this.draw_labels();
  this.draw_messages();

  // clear sprites
  this.sprites = [];
};
