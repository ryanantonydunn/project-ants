/* ========================================================================
    Game
    Main Canvas
 ========================================================================== */

/* Set up canvas
    ---------------------------------------- */

function setCanvasWidth(canvas) {
  var d = select("projectants");
  // limit game size
  canvas.w = d.offsetWidth;
  canvas.h = d.offsetHeight;
  if (canvas.h < 800) {
    canvas.w = round(canvas.w * (800 / canvas.h));
    canvas.h = round(canvas.h * (800 / canvas.h));
  }
  if (canvas.h > 1000) {
    canvas.w = round(canvas.w * (1000 / canvas.h));
    canvas.h = round(canvas.h * (1000 / canvas.h));
  }
  canvas.cx = round(canvas.w / 2);
  canvas.cy = round(canvas.h / 2);

  canvas.canv.width = canvas.w;
  canvas.canv.height = canvas.h;
  canvas.cont = canvas.canv.getContext("2d");
}

game.prototype.init_canvas = function() {
  // set up main canvas
  this.canvas = {};
  this.canvas.canv = element({ type: "canvas" });
  this.canvas.canv.style.position = "relative";
  setCanvasWidth(this.canvas);

  var self = this;
  window.addEventListener("resize", function() {
    setCanvasWidth(self.canvas);
  });
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
