/* ========================================================================
    Objects
 ========================================================================== */

/* Create a new game object
	---------------------------------------- */

core.prototype.create_object = function(props, state) {
  var state_ref = state || this.state;

  var obj = {
    type: "",
    player_id: "",
    id: "",
    frame: state_ref.frame,
    grounded: false,
    x: 0,
    y: 0,
    speed_x: 0,
    speed_y: 0,
    data: ""
  };
  obj = deepmerge(obj, props);
  obj.c = this.c.objects[obj.type];
  var key_type = obj.type;

  // set key
  if (
    obj.type === "player" ||
    obj.type === "player_ghost" ||
    obj.type === "player_missile"
  ) {
    obj.key = "player-" + obj.player_id;
  } else {
    obj.key =
      obj.type +
      "-" +
      obj.player_id +
      "-" +
      obj.id +
      "-" +
      obj.frame +
      "-" +
      obj.data;
  }

  // add to state objects
  state_ref.objects[obj.key] = obj;

  // return it
  return obj;
};

/* Snap object to another object
	---------------------------------------- */

core.prototype.snap_object = function(obj1, obj2) {
  obj1.grounded = obj2.grounded;
  obj1.x = obj2.x;
  obj1.y = obj2.y;
  obj1.speed_x = obj2.speed_x;
  obj1.speed_y = obj2.speed_y;
};

/* Run through object frame events
	---------------------------------------- */

core.prototype.frame_objects = function() {
  // run through all objects
  for (var key in this.state.objects) {
    this.frame_object(this.state.objects[key]);
  }

  // check for player lock
  for (var key in this.state.players) {
    this.frame_player_lock(this.state.players[key]);
  }
};

core.prototype.frame_object = function(obj) {
  if (!obj) {
    return;
  }
  obj.destroyed = false;

  // stopping
  if (obj.c.stop > 0 && this.state.frame > obj.frame + obj.c.stop) {
    obj.speed_x = 0;
    obj.speed_y = 0;
  }

  // timeout
  if (obj.c.timeout > 0 && obj.frame + obj.c.timeout <= this.state.frame) {
    this.run_event(obj, "die");
    return;
  }

  // run physics on object
  this.physics(obj);

  // events
  this.event(obj, "frame");
};

/* Spawns
	---------------------------------------- */

core.prototype.spawn = function(props) {
  // weapon crate contents
  if (props.type == "crate") {
    if (this.crate_list.length < 1) {
      return;
    }
    props.data = this.crate_list[rand(0, this.crate_list.length)];
  }

  // do we have a set position
  if (!props.x && !props.y) {
    var pos = this.map.air_find_spot();
    props.x = pos.x;
    props.y = pos.y;
  }

  return this.create_object(props);
};
