/* ========================================================================
    Game
    Tracker Arrows
 ========================================================================== */

/* Run the arrows
    ---------------------------------------- */

game.prototype.run_arrows = function() {
  for (var type in this.scheme.arrows) {
    var arrow = this.scheme.arrows[type];
    if (!arrow) {
      continue;
    }

    // find closest thing
    var lowest = 99999;
    var closest_obj = null;
    for (var key in this.core.state.objects) {
      var obj = this.core.state.objects[key];
      if (obj.type === "player" && obj.player_id === this.player_id) {
        continue;
      }
      if (obj.type === type) {
        var dist = this.core.map.get_distance(
          obj.x,
          obj.y,
          this.camera.x,
          this.camera.y
        );
        if (dist < lowest) {
          lowest = dist;
          closest_obj = obj;
        }
      }
    }
    if (!closest_obj) {
      continue;
    }

    // get screen position
    var pos = this.screen_position(closest_obj.x, closest_obj.y, 80);
    if (pos.on_screen) {
      continue;
    }

    // show an arrow
    var angle = this.core.map.get_heading(
      this.camera.x,
      this.camera.y,
      closest_obj.x,
      closest_obj.y
    );
    var dist = min(lowest, min(this.canvas.cx, this.canvas.cy)) - 22;
    var xy = xy_speed(angle, dist);
    this.sprites.push({
      type: "arrow-" + arrow,
      x: round(this.camera.x + xy.x),
      y: round(this.camera.y + xy.y),
      angle: angle_add(angle, 270)
    });
  }
};
