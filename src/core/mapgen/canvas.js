/* ========================================================================
	Map Generator
	Make Canvas
 ========================================================================== */

/* Set up a new canvas
	---------------------------------------- */

function mapgen_canvas(w, h) {
  var obj = {};
  if ("undefined" != typeof global) {
    obj.canv = new canvas();
  } else {
    obj.canv = document.createElement("canvas");
  }
  obj.cont = obj.canv.getContext("2d");
  obj.canv.width = w;
  obj.canv.height = h;
  obj.cont.fillStyle = "#fff";
  obj.w = w;
  obj.h = h;
  return obj;
}

/* Draw a pattern to a canvas
	---------------------------------------- */

function mapgen_pattern(alpha, pattern) {
  var canv = mapgen_canvas(alpha.width, alpha.height);
  if (typeof pattern !== "string") {
    pattern = canv.cont.createPattern(pattern, "repeat");
  }
  canv.cont.fillStyle = pattern;
  canv.cont.fillRect(0, 0, alpha.width, alpha.height);
  canv.cont.globalCompositeOperation = "destination-in";
  canv.cont.drawImage(alpha, 0, 0);
  canv.cont.globalCompositeOperation = "normal";

  return canv;
}
