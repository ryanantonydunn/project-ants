/* ========================================================================
    Game
    Timer
 ========================================================================== */

/* Build time interface
    ---------------------------------------- */

game.prototype.init_time = function() {
  if (!this.scheme.show_time) {
    return;
  }

  // time divs
  this.div_time = element({ class: "time" });
  this.div_timeout = element({ class: "timeout" });
  append(this.div, this.div_time);
  append(this.div, this.div_timeout);
  hide(this.div_timeout);

  this.display_time = "";
};

/* Run the time interface
    ---------------------------------------- */

game.prototype.run_time = function() {
  if (!this.scheme.show_time) {
    return;
  }

  var secs;

  // counting up
  if (this.scheme.time_limit === 0) {
    secs = floor(this.core.state.frame / 24);

    // counting down
  } else {
    var dif = this.scheme.time_limit - this.core.state.frame;
    secs = ceil(dif / 24);

    // timeout
    if (dif === 240) {
      show(this.div_timeout);
    }
    if (dif <= 240 && dif % 24 === 0 && dif > 1) {
      this.audio.play("bloop2", 0.5);
    }
    if (dif === 1) {
      hide(this.div_timeout);
    }
    if (secs <= 10) {
      if (dif % 24 === 0 && secs >= 1) {
        this.div_timeout.innerHTML = secs;
      }
      if (dif === 96) {
        this.audio.play("timeout", 0.8);
      }
    }
  }

  // do time
  var new_time = "0:00";
  if (secs > 0) {
    var minutes = floor(secs / 60),
      seconds = (secs - minutes * 60).toString();
    seconds = seconds.length < 2 ? "0" + seconds : seconds;
    new_time = minutes + ":" + seconds;
  }
  if (this.display_time !== new_time) {
    this.display_time = new_time;
    this.div_time.innerHTML = new_time;
  }
};
