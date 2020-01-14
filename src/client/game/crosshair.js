/* ========================================================================
    Game
    Crosshair
 ========================================================================== */

/* Set up crosshair
	---------------------------------------- */

game.prototype.init_crosshair = function() {
  this.crosshair = 0;
  // this.crosshair_source = "button";
};

/* Calculate crosshair from cursor position
	---------------------------------------- */

game.prototype.run_crosshair = function() {
  if (!this.player || this.player.dead || !this.player_obj) {
    return;
  }
  var obj = this.core.state.objects[this.player_obj.key];
  if (!obj) {
    return;
  }

  this.crosshair = this.core.map.get_heading(
    obj.x,
    obj.y,
    this.cursor.x,
    this.cursor.y
  );

  // // calculate from cursor
  // if (this.crosshair_source == "cursor") {
  // 	this.crosshair = this.core.map.get_heading(obj.x, obj.y, this.cursor.x, this.cursor.y);

  // // calculate from buttons
  // } else
  // if (this.crosshair_source == "button") {

  // 	// calculate angle of crosshair
  // 	var angle = -1;
  // 	if (this.input.actions.move_up) {
  // 		angle = 90;
  // 		if (this.input.actions.move_right) { angle = 135; }
  // 		if (this.input.actions.move_left) { angle = 45; }
  // 	} else
  // 	if (this.input.actions.move_down) {
  // 		angle = 270;
  // 		if (this.input.actions.move_right) { angle = 225; }
  // 		if (this.input.actions.move_left) { angle = 305; }
  // 	} else {
  // 		if (this.input.actions.move_right) { angle = 180; }
  // 		if (this.input.actions.move_left) { angle = 0; }
  // 	}
  // 	if (angle !== -1) {
  // 		this.crosshair = increment_angle(this.crosshair, angle, 4);
  // 	}
  // }
};
