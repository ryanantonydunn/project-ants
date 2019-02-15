/* ========================================================================
    Game
    Audio
 ========================================================================== */

/* Set up audio objects
    ---------------------------------------- */

game.prototype.init_audio = function() {
  // objects with repeating sounds
  this.audio_objs = {};

  // weapon loops
  this.audio_weapons = {};

  // set up power up sound
  this.power_up_audio_on = false;
};

/* Check all game objects with audio objects
    ---------------------------------------- */

game.prototype.run_audio = function() {
  // remove old audio objects
  for (key in this.audio_objs) {
    if (!this.core.state.objects[key]) {
      if (this.audio_objs[key]) {
        this.audio_objs[key].gain.disconnect();
        this.audio_objs[key] = null;
      }
    }
  }

  // objects
  for (key in this.core.state.objects) {
    var obj = this.core.state.objects[key];

    // what noise should be playing
    var audio_key = null;
    if (obj.grounded && obj.animate && obj.actioned) {
      audio_key = obj.c.audio.walk;
    } else {
      audio_key = obj.c.audio.air;
    }

    var volume = this.get_dist_volume(obj.x, obj.y);
    var audio_obj = this.audio_objs[key];

    // if there is an audio file playing
    if (audio_obj) {
      // change its volume
      this.audio.set_volume(audio_obj, volume);

      // disconnect it
      if (volume <= 0 || audio_obj.audio_key != audio_key || !audio_key) {
        audio_obj.gain.disconnect();
        this.audio_objs[key] = null;
      }

      // if there is not an audio file playing
    } else {
      if (audio_key) {
        this.audio_objs[key] = this.audio.play(audio_key, volume, true);
      }
    }
  }
};

/* Set a weapon shot sound effect
    ---------------------------------------- */

game.prototype.play_weapon_audio = function(props) {
  var weapon = this.c.weapons[props.weapon];
  if (!weapon) {
    return;
  }
  if (!this.audio.buffers[weapon.fire_audio]) {
    return;
  }

  // get volume
  var volume = this.get_dist_volume(props.x, props.y);
  this.audio.play(weapon.fire_audio, volume);
};

/* Get distance volume
    ---------------------------------------- */

game.prototype.get_dist_volume = function(x, y) {
  var distance = this.core.map.get_distance(x, y, this.camera.x, this.camera.y);
  var volume = (1200 - distance) / 1200;
  volume *= volume;
  return volume;
};
