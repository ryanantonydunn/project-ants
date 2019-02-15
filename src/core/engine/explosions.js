/* ========================================================================
    Explosions
 ========================================================================== */

/* Create an explosion
	---------------------------------------- */

core.prototype.create_explosion = function(props, state) {
  var state_ref = state || this.state;

  var obj = {
    type: "explosion",
    player_id: "",
    frame: state_ref.frame,
    x: 0,
    y: 0,
    parent: "",
    parent_type: ""
  };
  obj = deepmerge(obj, props);
  obj.c = this.c.objects[obj.parent_type];

  // add to state objects
  state_ref.explosions[obj.parent] = obj;
};

/* Check all existing explosions
	---------------------------------------- */

core.prototype.frame_explosions = function() {
  // go through all explosions
  for (var key in this.state.explosions) {
    var explode = this.state.explosions[key];

    // if expired remove
    if (this.state.frame > explode.frame + 40) {
      delete this.state.explosions[key];
    }

    // if exploding this frame run
    if (this.state.frame === explode.frame + 1) {
      this.run_explosion(explode);
    }
  }
};

/* Run an explosion
	---------------------------------------- */

core.prototype.run_explosion = function(explode) {
  // if no damage
  if (!explode.c.damage) {
    return;
  }

  // calculate additional player damage
  var damage = this.get_damage(explode);

  // check collisions
  for (key in this.state.objects) {
    var obj = this.state.objects[key];

    // if object was just made
    if (this.state.frame < obj.frame + 2) {
      continue;
    }

    // run collision check
    if (
      !this.collision_check(
        obj.x,
        obj.y,
        explode.x,
        explode.y,
        obj.c.size,
        damage * 2
      )
    ) {
      this.event(obj, "explosion", explode);
    }
  }

  // record ground damage
  var ptype = this.c.objects[explode.parent_type];
  if (ptype && ptype.destroy_ground) {
    this.state.events.push({
      type: "ground_damage",
      frame: this.state.frame,
      x: explode.x,
      y: explode.y,
      radius: damage
    });
  }
};
