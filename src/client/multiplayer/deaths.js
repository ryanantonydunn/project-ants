/* ========================================================================
    Multiplayer
    Player Deaths
 ========================================================================== */

/* Check if we're dead
    ---------------------------------------- */

multiplayer.prototype.frame_dead = function() {
  // not ready for any death stuff
  if (!this.game || !this.game.core || !this.game.player) {
    return;
  }

  // count up to deadness
  if (this.game.player.dead) {
    if (!this.dead) {
      if (this.wait_for_dead < 48) {
        this.wait_for_dead++;
      } else {
        this.death();
      }
    }
  } else {
    this.wait_for_dead = 0;
    if (this.dead) {
      this.respawn();
    }
  }

  // deadness
  if (this.dead) {
    if (this.wait_for_respawn > 0) {
      this.wait_for_respawn--;
      if (this.wait_for_respawn === 0) {
        this.div_dead_countdown.innerHTML = "Click to respawn";
        remove_class(this.button_respawn, "disabled");
      } else {
        this.div_dead_countdown.innerHTML =
          "Respawn in " + ceil(this.wait_for_respawn / 24) + " seconds";
      }
    }
  }
};

/* We have died
    ---------------------------------------- */

multiplayer.prototype.death = function() {
  this.dead = true;
  this.wait_for_dead = 0;
  this.wait_for_respawn = 96;

  hide(this.div_dead_text);
  add_class(this.button_respawn, "disabled");
  show(this.div_dead);
};

/* Respawn triggered
    ---------------------------------------- */

multiplayer.prototype.respawn = function() {
  this.dead = false;
  hide(this.div_dead);
};
