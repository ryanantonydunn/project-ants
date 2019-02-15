/* ========================================================================
    Mulitplayer
    Frames
 ========================================================================== */

/* Start/stop loop
    ---------------------------------------- */

multiplayer.prototype.loop_start = function(start_frame) {
  // close any open loops
  this.loop_stop();

  // set loop vars
  this.start_frame = start_frame || 0;
  this.frames = this.start_frame;
  this.start_time = new Date().getTime();

  var self = this;
  this.interval = setInterval(function() {
    self.run_tick();
  }, 10);
};

multiplayer.prototype.loop_stop = function() {
  clearInterval(this.interval);
};

/* Run tick
    ---------------------------------------- */

multiplayer.prototype.run_tick = function() {
  // calculate number of frames since game start
  var now = new Date().getTime();
  var frames =
    this.start_frame + Math.floor((now - this.start_time) / this.ms_loop);

  // get number of remaining steps
  var frame_difference = frames - this.frames;

  // waiting
  if (frame_difference < 1) {
    return;
  }

  // too much lag
  if (frame_difference > 10) {
    this.loop_start();
    // console.log("tick lag | " + frame_difference);
    return;
  }

  // go through frames to process
  for (var i = 0; i < frame_difference; i++) {
    this.frame();
  }

  // run display loop
  this.game.frame_display();

  // record time this was done
  this.fpses.push(new Date().getTime());
  if (this.fpses.length > 72) {
    this.div_fps.innerHTML = round(
      (3000 / (this.fpses[72] - this.fpses[0])) * this.fps
    );
    this.fpses.splice(0, 1);
  }
};

/* Frame process
    ---------------------------------------- */

multiplayer.prototype.frame = function() {
  // increment frame count
  this.frames++;

  // store input
  if (this.game.player) {
    var action = this.game.get_input();
    if (action) {
      this.store_input[this.frames] = action;
      this.send_input(action);
    }
  }

  // run frame
  this.frame_run(this.frames);

  // remove old states
  this.remove_old_states();

  // run ground damage checks
  this.frame_ground();

  // run death frames
  this.frame_dead();

  // run players interface
  if (this.frames % 48 === 0) {
    this.players_interface();
  }

  // run ping
  if (this.frames % 12 === 0) {
    this.sockets.message_send("ping", [this.frames]);
    this.pings[this.frames] = { start: new Date().getTime() };
  }
};

/* Frame run
    ---------------------------------------- */

multiplayer.prototype.frame_run = function(frame) {
  // run core and store response
  var response = this.game.frame_core(frame, this.store_input[frame]);
  if (response.success) {
    this.store_responses.push(response);
  }

  // events
  this.run_event(this.game.core.state.events);

  // unpack any stored server state for this frame
  if (this.store_packet[frame]) {
    this.set_game_state(this.store_packet[frame]);
    delete this.store_packet[frame];
  }

  // record game state
  this.store_state[frame] = {
    frames: frame,
    state: this.game.core.pack_state(this.game.core.state)
  };
};

/* Remove old states
    ---------------------------------------- */

multiplayer.prototype.remove_old_states = function() {
  for (var frame in this.store_packet) {
    if (parseInt(frame) + 50 < this.frames) {
      delete this.store_packet[frame];
    }
  }
  for (var frame in this.store_state) {
    if (parseInt(frame) + 50 < this.frames) {
      delete this.store_state[frame];
    }
  }
  for (var frame in this.store_input) {
    if (parseInt(frame) + 50 < this.frames) {
      delete this.store_input[frame];
    }
  }
  for (var i = 0; i < this.store_responses.length; i++) {
    if (this.store_responses[i].frame + 50 < this.frames) {
      this.store_responses.splice(i, 1);
    }
  }
};
