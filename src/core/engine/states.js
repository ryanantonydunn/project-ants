/* ========================================================================
    State management
 ========================================================================== */

/* Get state
	---------------------------------------- */

core.prototype.pack_state = function(state) {
  // players
  var players = [];
  for (var id in state.players) {
    players.push(this.pack_player(state.players[id]));
  }

  // go through objects
  var objects = [];
  for (var key in state.objects) {
    objects.push(this.pack_object(state.objects[key]));
  }

  // go through explosions
  var explosions = [];
  for (key in state.explosions) {
    explosions.push(this.pack_explosion(state.explosions[key]));
  }

  return (
    players.join("#") + "+" + objects.join("#") + "+" + explosions.join("#")
  );
};

/* Set state
	---------------------------------------- */

core.prototype.unpack_state = function(str) {
  // blank state
  var state = this.blank_state();

  // run through state string
  var split = str.split("+");
  for (var i = 0; i < split.length; i++) {
    if (split[i]) {
      var split2 = split[i].split("#");
      for (var j = 0; j < split2.length; j++) {
        if (i == 0) {
          this.unpack_player(state, split2[j]);
        }
        if (i == 1) {
          this.unpack_object(state, split2[j]);
        }
        if (i == 2) {
          this.unpack_explosion(state, split2[j]);
        }
      }
    }
  }

  return state;
};

/* Players
	---------------------------------------- */

core.prototype.pack_player = function(obj) {
  // prep basic values
  var dead = obj.dead ? "1" : "";
  var weapon = this.armoury_refs.indexOf(obj.weapon);

  // prep armoury
  var armoury = [];
  for (var key in obj.armoury) {
    armoury.push(obj.armoury[key]);
  }
  armoury = armoury.join("$");

  // prep events
  var events = [];
  for (var i = 0; i < obj.events.length; i++) {
    var event = obj.events[i];
    if (event.type === "walk") {
      events.push(event.frame + "~0");
    }
    if (event.type === "jump") {
      events.push(event.frame + "~1");
    }
    if (event.type === "shoot") {
      events.push(event.frame + "~2~" + event.obj + "~" + event.weapon);
    }
    if (event.type === "crate") {
      events.push(event.frame + "~3~" + event.obj);
    }
    if (event.type === "medpack") {
      events.push(event.frame + "~4~" + event.obj);
    }
    if (event.type === "gem") {
      events.push(event.frame + "~5~" + event.obj);
    }
  }
  events = events.join("$");

  // return player string
  var arr = [
    obj.id,
    obj.level,
    obj.score,
    dead,
    obj.health,
    obj.cooldown,
    obj.hit,
    obj.locked,
    armoury,
    weapon,
    events
  ];
  return arr.join("/");
};

core.prototype.unpack_player = function(state, str) {
  var split = str.split("/");
  var props = {};
  props.id = parseInt(split[0]);
  props.level = parseInt(split[1]);
  props.score = parseInt(split[2]);
  props.dead = split[3] === "1" ? true : false;
  props.health = parseInt(split[4]);
  props.cooldown = parseInt(split[5]);
  props.hit = parseInt(split[6]);
  props.locked = split[7];

  // prep armoury
  props.armoury = {};
  var split2 = split[8].split("$");
  for (var i = 0; i < split2.length; i++) {
    var key = this.armoury_refs[i];
    props.armoury[key] = parseInt(split2[i]);
  }

  // weapon
  var wep = parseInt(split[9]);
  if (wep !== -1) {
    props.weapon = this.armoury_refs[wep];
  }

  // prep events
  props.events = [];
  var split2 = split[10].split("$");
  for (var i = 0; i < split2.length; i++) {
    var split3 = split2[i].split("~");
    var obj = { frame: parseInt(split3[0]) };
    if (split3[1] === "0") {
      obj.type = "walk";
    }
    if (split3[1] === "1") {
      obj.type = "jump";
    }
    if (split3[1] === "2") {
      obj.type = "shoot";
      obj.obj = split3[2];
      obj.weapon = split3[3];
    }
    if (split3[1] === "3") {
      obj.type = "crate";
      obj.obj = split3[2];
    }
    if (split3[1] === "4") {
      obj.type = "medpack";
      obj.obj = split3[2];
    }
    if (split3[1] === "5") {
      obj.type = "gem";
      obj.obj = split3[2];
    }
    if (obj) {
      props.events.push(obj);
    }
  }

  // make it
  this.create_player(props, state);
};

/* Objects
	---------------------------------------- */

core.prototype.pack_object = function(obj) {
  var grounded = obj.grounded ? "1" : "";
  var arr = [
    obj.type,
    obj.player_id,
    obj.id,
    obj.frame,
    grounded,
    obj.x,
    obj.y,
    obj.speed_x,
    obj.speed_y,
    obj.data
  ];
  return arr.join("/");
};

core.prototype.unpack_object = function(state, str) {
  var split = str.split("/");
  var props = {};
  props.type = split[0];
  props.player_id = parseInt(split[1]);
  props.id = split[2];
  props.frame = parseInt(split[3]);
  props.grounded = split[4] === "1" ? true : false;
  props.x = parseFloat(split[5]);
  props.y = parseFloat(split[6]);
  props.speed_x = parseFloat(split[7]);
  props.speed_y = parseFloat(split[8]);
  props.data = split[9];

  this.create_object(props, state);
};

/* Explosions
	---------------------------------------- */

core.prototype.pack_explosion = function(obj) {
  var arr = [
    obj.player_id,
    obj.frame,
    obj.x,
    obj.y,
    obj.parent,
    obj.parent_type
  ];
  return arr.join("/");
};

core.prototype.unpack_explosion = function(state, str) {
  var split = str.split("/");
  var props = {};
  props.player_id = parseInt(split[0]);
  props.frame = parseInt(split[1]);
  props.x = parseFloat(split[2]);
  props.y = parseFloat(split[3]);
  props.parent = split[4];
  props.parent_type = split[5];

  this.create_explosion(props, state);
};
