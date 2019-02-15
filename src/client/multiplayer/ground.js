/* ========================================================================
    Mulitplayer
    Ground Damage
 ========================================================================== */

/* Damage the ground event
    ---------------------------------------- */

multiplayer.prototype.event_ground_damage = function(event) {
  var key = event.frame + "-" + event.x + "-" + event.y + "-" + event.radius;

  // did we already have this happen
  if (this.ground_events[key]) {
    return;
  }

  // get boundaries
  var x1 = max(round(event.x - event.radius), 0);
  var x2 = min(round(event.x + event.radius), this.game.core.map.w - 1);
  var y1 = max(round(event.y - event.radius), 0);
  var y2 = min(round(event.y + event.radius), this.game.core.map.h - 1);
  var w = x2 - x1;
  var h = y2 - y1;

  // get array from the map
  var arr = this.game.core.map.get_block(x1, y1, w, h);

  // get piece of the map
  var canv = this.game.get_land_block(x1, y1, w, h);

  // store backed up damage
  this.ground_temp[key] = {
    frame: event.frame,
    x: x1,
    y: y1,
    arr: arr,
    canv: canv
  };

  // store the event itself
  this.ground_events[key] = duplicate_obj(event);
  this.ground_events[key].done = true;

  // run the event
  this.game.run_event(event);
};

/* Check ground damage events
    ---------------------------------------- */

multiplayer.prototype.frame_ground = function() {
  // go through all checks
  for (var key in this.ground_temp) {
    if (this.frames > this.ground_temp[key].frame + 40) {
      clog("damage not confirmed");
      this.undo_ground_damage(this.ground_temp[key], key);
      delete this.ground_temp[key];
      delete this.ground_events[key];
    }
  }

  // go through all events
  for (var key in this.ground_events) {
    var event = this.ground_events[key];
    if (this.frames >= event.frame) {
      if (!event.done) {
        this.game.run_event(event);
        this.ground_events[key].done = true;
      }
    }
    if (this.frames > this.ground_events[key].frame + 50) {
      delete this.ground_events[key];
    }
  }
};

/* Undo ground damage
    ---------------------------------------- */

multiplayer.prototype.undo_ground_damage = function(damage, d_key) {
  // restore it
  this.game.core.map.set_block_from_arr(damage.x, damage.y, damage.arr);
  this.game.draw_land_block(damage.x, damage.y, damage.canv);

  // redo any other events that happened since
  for (var key in this.ground_events) {
    if (d_key === key) {
      continue;
    }
    this.game.run_event(this.ground_events[key]);
  }
};

/* Server response
    ---------------------------------------- */

multiplayer.prototype.resolve_ground = function(str) {
  if (!str) {
    return;
  }

  // unpack damages
  var split = str.split("$");
  for (var i = 0; i < split.length; i++) {
    var split2 = split[i].split("~");
    var event = {
      type: "ground_damage",
      frame: parseInt(split2[0]),
      x: parseFloat(split2[1]),
      y: parseFloat(split2[2]),
      radius: parseFloat(split2[3]),
      dig: split2[4] === "1"
    };
    var key = event.frame + "-" + event.x + "-" + event.y + "-" + event.radius;

    // confirm already done damage
    if (this.ground_temp[key]) {
      delete this.ground_temp[key];

      // wait to perform it
    } else {
      this.ground_events[key] = event;
    }
  }
};
