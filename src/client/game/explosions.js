/* ========================================================================
    Game
    Explosions
 ========================================================================== */

/* Check for explosions
    ---------------------------------------- */

game.prototype.run_explosions = function() {
  // run through all explosions
  for (var key in this.core.state.explosions) {
    var explode_state = this.core.state.explosions[key];
    var explode_sprite = this.explosions[key];

    // if it's not started
    if (!explode_sprite) {
      var type = this.c.objects[explode_state.parent_type];
      if (!type) {
        continue;
      }

      // create sprite reference
      this.explosions[key] = {
        sprite: type.animation.explosion,
        frame: this.core.state.frame,
        x: explode_state.x,
        y: explode_state.y
      };

      // run sound effect
      if (type.audio.explosion) {
        this.run_event_sound({
          sound: type.audio.explosion,
          x: explode_state.x,
          y: explode_state.y
        });
      }

      // run screen shake
      if (type.damage > 0) {
        this.run_event_screen_shake({
          radius: type.damage,
          x: explode_state.x,
          y: explode_state.y
        });
      }

      continue;
    }

    // match position
    explode_sprite.x = explode_sprite.x;
    explode_sprite.y = explode_sprite.y;
  }

  // remove explosions
  for (var key in this.explosions) {
    if (this.core.state.frame > this.explosions[key].frame + 60) {
      delete this.explosions[key];
    }
  }
};
