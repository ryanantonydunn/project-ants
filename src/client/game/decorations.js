/* ========================================================================
    Game
    Decorations
 ========================================================================== */

/* Create decoration
    ---------------------------------------- */

game.prototype.create_decoration = function(props) {
  var obj = {
    frame: this.core.state.frame,
    type: "",
    id: "",
    x: 0,
    y: 0,
    speed_x: 0,
    speed_y: 0,
    timeout: 0,
    angle: 0,
    repeat: true,
    sprite: ""
  };
  obj = deepmerge(obj, props);
  obj.key =
    obj.frame + "-" + obj.x + "-" + obj.y + "-" + obj.sprite + "-" + obj.id;
  this.decorations[obj.key] = obj;
};

/* Run decorations
    ---------------------------------------- */

game.prototype.run_decorations = function() {
  // create trails from objects
  for (key in this.core.state.objects) {
    var obj = this.core.state.objects[key];
    if (obj.c.trails.count === 0) {
      continue;
    }
    this.create_trail(obj, obj.c.trails);
  }

  // go through all decorations
  for (var key in this.decorations) {
    var dec = this.decorations[key];

    // do timeout
    dec.timeout--;
    if (dec.timeout < 1) {
      delete this.decorations[key];
      continue;
    }

    // move
    dec.x = this.core.map.loop_x(dec.x + dec.speed_x).fixed();
    dec.y = this.core.map.loop_y(dec.y + dec.speed_y).fixed();
  }
};

/* Create trails
	---------------------------------------- */

game.prototype.create_trail = function(obj, trails) {
  // create the trails
  for (var i = 0; i < trails.count; i++) {
    var args = {
      id: i,
      sprite: trails.sprite,
      timeout: trails.timeout,
      x: obj.dx,
      y: obj.dy
    };
    if (trails.rotate) {
      args.angle = rand(0, 360);
    } else {
      args.angle = angle_add(get_angle(-obj.speed_x, -obj.speed_y), 90);
      args.x -= obj.speed_x;
      args.y -= obj.speed_y;
      if (trails.offset_x || trails.offset_y) {
        var xyx = xy_speed(angle_add(args.angle, 90), trails.offset_x);
        var xyy = xy_speed(angle_add(args.angle, 180), trails.offset_y);
        args.x += xyx.x + xyy.x;
        args.y += xyx.y + xyy.y;
      }
    }
    if (trails.move) {
      var move_angle = rand(0, 360);
      var xy = xy_speed(move_angle, trails.speed);
      args.speed_x = -xy.x;
      args.speed_y = -xy.y;
    }
    this.create_decoration(args);
  }
};
