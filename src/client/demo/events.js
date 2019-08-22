/* ========================================================================
    Multiplayer
    Events
 ========================================================================== */

/* Run events
    ---------------------------------------- */

demo.prototype.run_event = function(event) {
  if (!event) {
    return;
  }

  // handle arrays of events
  if (Array.isArray(event)) {
    for (var i = 0; i < event.length; i++) {
      this.run_event(event[i]);
    }
    return;
  }

  // run events
  if (event.type === "player_death") {
    this.event_player_death(event);
  }

  // send event down a level
  else if (this.game) {
    this.game.run_event(event);
  }
};

/* Player death
  ---------------------------------------- */

demo.prototype.event_player_death = function(event) {
  if (this.initialised) {
    console.log("died");
  }
};
