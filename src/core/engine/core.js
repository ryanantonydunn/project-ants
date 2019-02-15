/* ========================================================================
    Core
 ========================================================================== */

/* create core object
	---------------------------------------- */

function core(config, scheme, map, gravity_map) {
  // config
  this.c = config;
  this.scheme = scheme;
  this.map = new core_map(map, scheme, gravity_map);

  // crate chance table
  this.crate_list = [];
  for (var key in this.scheme.weapons) {
    for (var i = 0; i < this.scheme.weapons[key].crate_chance; i++) {
      this.crate_list.push(key);
    }
  }

  // armoury reference table
  this.armoury_refs = [];
  for (key in this.scheme.weapons) {
    this.armoury_refs.push(key);
  }
}

/* Set a blank state
	---------------------------------------- */

core.prototype.blank_state = function() {
  return {
    frame: 0,
    explosions: {},
    objects: {},
    players: {},
    events: []
  };
};

/* Run every frame
	---------------------------------------- */

core.prototype.frame = function() {
  this.frame_explosions();
  this.frame_players();
  this.frame_objects();
};
