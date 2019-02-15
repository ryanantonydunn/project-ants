/* ========================================================================
    Game
    Events
 ========================================================================== */

/* Run events
    ---------------------------------------- */

game.prototype.run_events = function(events) {
  // events from scheme
  var f_event = this.scheme.events.frame[this.core.current_frame];
  if (f_event) {
    this.run_event(f_event);
  }
};

game.prototype.run_event = function(event) {
  // handle array of events
  if (Array.isArray(event)) {
    for (var i = 0; i < event.length; i++) {
      this.run_event(event[i]);
    }
  }

  // run event
  if (event.type === "weapon_select") {
    this.weapon_select_n(event.n);
  } else if (event.type === "weapon_scroll") {
    this.weapon_scroll(event.down);
  } else if (event.type === "switch_watcher_camera") {
    this.switch_watcher_camera();
  } else if (event.type === "follow_weapon") {
    this.toggle_weapon_follow(true);
  } else if (event.type === "follow_mouse") {
    this.toggle_mouse_follow();
  } else if (event.type === "ground_damage") {
    this.run_event_ground_damage(event);
  } else if (event.type === "screen_shake") {
    this.run_event_screen_shake(event);
  } else if (event.type === "player_health") {
    this.run_event_player_health(event);
  } else if (event.type === "player_level") {
    this.run_event_player_level(event);
  } else if (event.type === "explosion") {
    this.run_event_explosion(event);
  } else if (event.type === "armoury") {
    this.run_event_armoury(event);
  } else if (event.type === "bounce") {
    this.run_event_bounce(event);
  } else if (event.type === "sound") {
    this.run_event_sound(event);
  } else if (event.type === "target") {
    this.run_event_target(event);
  } else if (event.type === "spawn") {
    this.run_event_spawn(event);
  } else if (event.type === "focus") {
    this.run_event_focus(event);
  } else if (event.type === "alert") {
    this.run_event_alert(event);
  } else if (event.type === "collect") {
    this.run_event_collect(event);
  }
};

/* Ground Damage
    ---------------------------------------- */

game.prototype.run_event_ground_damage = function(event) {
  // are we destroying land
  if (!this.scheme.destroy_land) {
    return;
  }

  // damage the ground
  this.core.map.set_circle(event.x, event.y, event.radius, 0);
  this.destroy_land(event.x, event.y, event.radius);
  // this.core.map.gravity_event_recalculate(event.x, event.y, event.radius);

  // do the dig noise and smoke trails
  if (event.dig) {
    this.run_event_sound({ x: event.x, y: event.y, sound: "dig" });
    this.create_trail(
      { dx: event.x, dy: event.y },
      {
        count: 7,
        sprite: "smoke",
        timeout: 20,
        rotate: true,
        move: true,
        speed: 1
      }
    );
  }
};

/* Screen Shake
    ---------------------------------------- */

game.prototype.run_event_screen_shake = function(event) {
  var distance = this.core.map.get_distance(
    event.x,
    event.y,
    this.camera.x,
    this.camera.y
  );
  if (distance < event.radius * 2) {
    this.camera.shake_frame = this.core.state.frame;
    this.camera.shake_size = (distance - event.radius) / 4;
  }
};

/* Health
    ---------------------------------------- */

game.prototype.run_event_player_health = function(event) {
  var obj = this.core.state.objects["player-" + event.id];
  if (obj) {
    var text = String.fromCharCode(9829) + " " + event.health;
    this.create_message(obj, "#ff9999", text, 22);
  }
};

/* Level
    ---------------------------------------- */

game.prototype.run_event_player_level = function(event) {
  var obj = this.core.state.objects["player-" + event.id];

  // is this us
  if (this.player_id === event.id) {
    this.set_score();

    // set alert
    if (event.new > event.prev) {
      var lv = this.scheme.levels;
      var n1 = event.new;
      var n2 = event.prev;
      var benefits = "";
      if (lv.health[n1] > lv.health[n2]) {
        benefits += "<br>+" + (lv.health[n1] - lv.health[n2]) + " max health";
      }
      if (lv.damage[n1] > lv.damage[n2]) {
        benefits += "<br>+" + (lv.damage[n1] - lv.damage[n2]) + " damage";
      }
      if (lv.speed[n1] > lv.speed[n2]) {
        benefits += "<br>+" + (lv.speed[n1] - lv.speed[n2]) + " speed";
      }
      if (lv.jump[n1] > lv.jump[n2]) {
        benefits += "<br>+" + (lv.jump[n1] - lv.jump[n2]) + " jump power";
      }
      var text =
        "<small>You have reached</small><br><span class='large'>Level " +
        (event.new + 1) +
        "</span><small class='blue'>" +
        benefits +
        "</small>";
      this.set_alert(text, "#eeeeee", 150);
    }
  }

  // do the flourish
  if (event.new > event.prev) {
    this.create_message(obj, "#eee", "lvl " + (event.new + 1), 30, -30);
    this.run_event_sound({ x: obj.x, y: obj.y, sound: "levelup" });
    this.create_trail(obj, {
      count: 7,
      sprite: "star-blue",
      timeout: 30,
      rotate: true,
      move: true,
      speed: 1.5
    });
    this.create_trail(obj, {
      count: 7,
      sprite: "ball-red",
      timeout: 30,
      rotate: true,
      move: true,
      speed: 2
    });
  }
};

/* Explosion
    ---------------------------------------- */

game.prototype.run_event_explosion = function(event) {
  // focus camera if we were following it
  if (this.weapon_following === event.key) {
    this.camera.focus = this.core.state.frame;
    this.camera.focus_time = 30;
    this.camera.fx = event.x;
    this.camera.fy = event.y;
  }
};

/* Armoury
    ---------------------------------------- */

game.prototype.run_event_armoury = function(event) {
  if (event.player_id == this.player_id) {
    this.set_weapon(event.weapon);
  }
};

/* Bounce
    ---------------------------------------- */

game.prototype.run_event_bounce = function(event) {
  var obj = this.core.state.objects[event.obj];
  if (!obj) {
    return;
  }
  var sound = obj.c.audio.bounce;
  if (sound) {
    this.run_event_sound({ x: event.x, y: event.y, sound: sound });
  }
};

/* Sound
    ---------------------------------------- */

game.prototype.run_event_sound = function(event) {
  var volume = this.get_dist_volume(event.x, event.y);
  if (volume > 0) {
    this.audio.play(event.sound, volume);
  }
};

/* Set a target on the map
    ---------------------------------------- */

game.prototype.run_event_target = function(event) {
  this.create_decoration({
    sprite: "focus",
    timeout: event.time,
    x: event.x,
    y: event.y,
    repeat: false
  });
  this.audio.play("homing", 1);
};

/* Spawn Objects
    ---------------------------------------- */

game.prototype.run_event_spawn = function(event) {
  this.create_object(event.args, true);

  event.args.time = 30;
  if (event.target) {
    this.run_event_target(event.args);
  }
  if (event.focus) {
    this.run_event_focus(event.args);
  }
};

/* Focus Camera
    ---------------------------------------- */

game.prototype.run_event_focus = function(event) {
  this.camera.focus = this.core.state.frame;
  this.camera.focus_time = event.time;
  this.camera.fx = event.x;
  this.camera.fy = event.y;
  if (event.target) {
    this.run_event_target(event);
  }
};

/* Show alert
    ---------------------------------------- */

game.prototype.run_event_alert = function(event) {
  this.set_alert(event.text, "#eeeeee", event.time);
};

/* Crate Grab
    ---------------------------------------- */

game.prototype.run_event_collect = function(event) {
  // is this not us
  if (event.player_id !== this.player_id) {
    return;
  }

  // get our object
  var obj = this.core.state.objects["player-" + event.player_id];
  if (!obj) {
    return;
  }

  // crates
  if (event.collected === "crate") {
    var weapon = this.c.weapons[event.weapon];
    this.create_message(
      obj,
      "#eeeeee",
      "+" + event.count + " " + weapon.title,
      18
    );
  }

  // gems
  if (event.collected === "gem") {
    this.set_score();
    this.create_message(obj, "#aaff99", "+" + event.n, 22);
  }
};
