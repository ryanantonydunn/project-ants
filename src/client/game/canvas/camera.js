/* ========================================================================
    Game
    Camera Position
 ========================================================================== */

/* Set up camera position
	---------------------------------------- */

game.prototype.init_camera = function() {
  this.camera = {};
  this.camera.x = round(this.map.fg.canv.width / 2);
  this.camera.y = round(this.map.fg.canv.height / 2);
  this.camera.px = this.camera.x;
  this.camera.py = this.camera.y;

  // watcher follow player
  this.camera.watch_follow = "leader";
  this.camera.watch_follow_player = "";

  // camera weapon
  this.camera_weapon_key = null;

  // camera shake on hit
  this.camera.shake_frame = null;
  this.camera.sx = 0;
  this.camera.sy = 0;

  // camera focus event
  this.camera.focus = null;
  this.camera.focus_time = 0;
  this.camera.fx = 0;
  this.camera.fy = 0;

  // cursor
  this.cursor = { x: 0, y: 0 };

  // weapon following
  this.weapon_follow = false;
  this.weapon_following = "";
};

/* Switch watcher camera
	---------------------------------------- */

game.prototype.switch_watcher_camera = function() {
  if (!watch) {
    return;
  }
  var keys = Object.keys(this.players);
  var index = keys.indexOf(this.camera.watch_follow_player);
  if (index !== -1) {
    if (index === keys.length - 1) {
      this.camera.watch_follow_player = null;
      this.camera.watch_follow = "leader";
      this.set_alert("Following the Leader", "#ccffcc", 100);
      return;
    } else {
      this.camera.watch_follow_player = keys[index + 1];
    }
  } else {
    this.camera.watch_follow_player = keys[0];
  }
  console.log(this.camera.watch_follow_player);
  var player = this.players[this.camera.watch_follow_player];
  this.camera.watch_follow = "player";
  this.set_alert("Following " + player.name, "#eeeeee", 100);
};

/* Calculate current camera position
	---------------------------------------- */

game.prototype.run_camera = function() {
  // stop following if hit
  if (this.weapon_following && this.player && this.player.hit > 0) {
    this.weapon_following = "";
  }

  // set previous position
  this.camera.px = this.camera.x;
  this.camera.py = this.camera.y;

  var x, y, move;

  // set fallback camera
  var watch_player_id = 0;
  if (this.camera.watch_follow === "leader") {
    watch_player_id = this.leader;
  } else if (this.camera.watch_follow === "player") {
    watch_player_id = this.camera.watch_follow_player;
  }

  // find object to follow
  var follow_obj = this.core.state.objects[this.weapon_following];
  var watch_obj = this.core.state.objects["player-" + watch_player_id];
  if (follow_obj) {
    x = follow_obj.dx;
    y = follow_obj.dy;
    move = 30;
  } else if (this.player_obj) {
    x = this.player_obj.dx;
    y = this.player_obj.dy;
    move = 60;
  } else if (watch_obj) {
    x = watch_obj.dx;
    y = watch_obj.dy;
    move = 30;
  }

  // go to focus event
  if (
    this.camera.focus != null &&
    this.camera.focus < this.core.state.frame &&
    this.camera.focus + this.camera.focus_time > this.core.state.frame
  ) {
    x = this.camera.fx;
    y = this.camera.fy;
    move = 100;

    // follow cursor
  } else if (this.mouse_follow || !move) {
    x = this.cursor.x;
    y = this.cursor.y;
    move =
      this.core.map.get_distance(this.camera.x, this.camera.y, x, y) * 0.05;
  }

  // move towards new position
  if (move) {
    var dx = this.core.map.get_distance_x(this.camera.x, x);
    var dy = this.core.map.get_distance_y(this.camera.y, y);
    var limit = check_speed(dx, dy, move);
    this.camera.x = this.core.map.loop_x(round(this.camera.x + limit.x));
    this.camera.y = this.core.map.loop_y(round(this.camera.y + limit.y));
  }

  // add screen shake
  this.camera.sx = 0;
  this.camera.sy = 0;
  var diff = this.camera.shake_frame
    ? this.core.state.frame - this.camera.shake_frame
    : 0;
  if (diff < 15 && diff > 0) {
    this.camera.sx = cos((diff / 2.5 - 1.5) * pi) * this.camera.shake_size;
    this.camera.sy = sin((diff / 3 - 1) * pi) * this.camera.shake_size;
  }

  // fix cursor input
  this.cursor_map();
};

/* Toggle weapon following
	---------------------------------------- */

game.prototype.toggle_weapon_follow = function(message) {
  this.weapon_follow = !this.weapon_follow;

  if (message) {
    var text = "on";
    if (!this.weapon_follow) {
      text = "off";
      this.weapon_following = "";
    }
    text = "Follow weapons " + text;
    this.set_alert(text, "#eee");
  }
};

/* Toggle mouse following
	---------------------------------------- */

game.prototype.toggle_mouse_follow = function() {
  this.mouse_follow = !this.mouse_follow;
  var text = this.mouse_follow ? "on" : "off";
  text = "Free cam " + text;
  this.set_alert(text, "#eee");
};

game.prototype.cancel_mouse_follow = function() {
  if (this.mouse_follow) {
    this.toggle_mouse_follow();
  }
};

/* Calculate cursor position on map
	---------------------------------------- */

game.prototype.cursor_map = function() {
  var scale_x = this.canvas.canv.offsetWidth / this.canvas.w;
  var scale_y = this.canvas.canv.offsetHeight / this.canvas.h;
  var x1 =
    this.camera.x +
    round((this.input.cursor.x - round(innerWidth / 2)) * scale_x);
  var y1 =
    this.camera.y +
    round((this.input.cursor.y - round(innerHeight / 2)) * scale_y);
  this.cursor.x = this.core.map.loop_x(round(x1));
  this.cursor.y = this.core.map.loop_y(round(y1));
};

/* Screen position of a co-ordinate
	---------------------------------------- */

game.prototype.screen_position = function(x, y, size) {
  var x1 =
      this.canvas.cx +
      this.core.map.get_distance_x(this.camera.x - this.camera.sx, x),
    y1 =
      this.canvas.cy +
      this.core.map.get_distance_y(this.camera.y - this.camera.sy, y),
    on_screen =
      x1 > -size &&
      x1 < this.canvas.w + size &&
      y1 > -size &&
      y1 < this.canvas.h + size;

  return {
    x: x1,
    y: y1,
    on_screen: on_screen
  };
};
