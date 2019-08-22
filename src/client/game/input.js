/* ========================================================================
	Game
	Input
 ========================================================================== */

/* Get current core action input
	---------------------------------------- */

game.prototype.get_input = function() {
  // is the game active and does it have a player
  if (!this.active || !this.player || this.player.dead) {
    return;
  }

  // set source of crosshair movement
  if (
    this.input.active("move_up") ||
    this.input.active("move_down") ||
    this.input.active("move_left") ||
    this.input.active("move_right")
  ) {
    this.crosshair_source = "button";
  } else {
    if (this.input.cursor_moved) {
      this.crosshair_source = "cursor";
    }
  }
  this.input.cursor_moved = false;

  // get player actions
  var active = false;
  var response = {
    action: "none",
    angle: round(this.crosshair)
  };

  // weapon keys
  var shoot_key = false;
  var fire_weapon = false;
  var weapon = this.c.weapons[this.current_weapon];
  if (weapon && this.detonation_cooldown === 0 && this.input.active("shoot")) {
    // abandon a followed weapon
    if (this.core.state.objects[this.weapon_following]) {
      this.detonation_cooldown = 15;
      this.weapon_following = "";

      // normal firing
    } else {
      // on screen
      var pos = this.screen_position(
        this.player_obj.x,
        this.player_obj.y,
        this.player_obj.c.size
      );
      if (!pos.on_screen) {
        return;
      }

      // cooldown
      if (this.player.cooldown > 0) {
        return;
      }

      var weapon = this.c.weapons[this.current_weapon];
      if (!weapon) {
        return;
      }
      if (weapon.power_up && this.power_up < 60) {
        this.power_up++;
      } else {
        fire_weapon = true;
      }
    }
  } else {
    this.powered = false;
    if (this.power_up > 0) {
      fire_weapon = true;
    } else {
      this.power_up = 0;
    }
  }

  // fire weapon
  if (fire_weapon) {
    this.powered = true;
    response.action = "shoot";
    response.power = this.power_up;
    response.weapon = this.current_weapon;
    active = true;
    this.power_up = 0;
  }

  // walking restricted actions
  if (this.player_obj.grounded && !active) {
    // arrow key movement
    var arrow_angle = -1;
    if (this.input.active("move_up")) {
      arrow_angle = 90;
      if (this.input.active("move_right")) {
        arrow_angle = 135;
      }
      if (this.input.active("move_left")) {
        arrow_angle = 45;
      }
    } else if (this.input.active("move_down")) {
      arrow_angle = 270;
      if (this.input.active("move_right")) {
        arrow_angle = 225;
      }
      if (this.input.active("move_left")) {
        arrow_angle = 305;
      }
    } else {
      if (this.input.active("move_right")) {
        arrow_angle = 180;
      }
      if (this.input.active("move_left")) {
        arrow_angle = 0;
      }
    }
    if (arrow_angle !== -1) {
      response.action = "move";
      response.angle = arrow_angle;
      active = true;
    }

    // move crosshair key
    if (this.input.active("move")) {
      response.action = "move";
      active = true;
    }

    // jumping
    if (this.input.active("jump")) {
      response.action = "jump";
      active = true;
    }
  }

  // cancel mouse follow if doing stuff
  if (active) {
    this.cancel_mouse_follow();
  }

  if (!active) {
    return false;
  }

  // set the onboarding
  this.onboarding && this.onboarding.set(response.action);

  return response;
};
