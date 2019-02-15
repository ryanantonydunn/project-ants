/* ========================================================================
    Server
    Frames
 ========================================================================== */

/* Start/stop loop
    ---------------------------------------- */

room.prototype.loop_start = function() {
  // close any open loops
  this.loop_stop();
  this.frames = 0;

  // set start time to calculate frames from
  this.start_time = new Date().getTime();

  var self = this;
  this.interval = setInterval(function() {
    self.run_tick();
  }, 10);
};

room.prototype.loop_stop = function() {
  clearInterval(this.interval);
};

/* Run tick
    ---------------------------------------- */

room.prototype.run_tick = function() {
  // calculate number of frames since game start
  var now = new Date().getTime();
  var frames = Math.floor((now - this.start_time) / this.ms_loop);

  // get number of remaining steps
  if (this.frames > frames) {
    this.frames = frames;
  }
  var frame_difference = frames - this.frames;

  // waiting
  if (frame_difference < this.tick_frames) {
    return;
  }

  // too much lag
  if (frame_difference > 12) {
    this.loop_start();
    // console.log("resync | " + frame_difference);
    return;
  }

  // reset core
  this.core.state.events = [];

  // find oldest input frame we have to revert to and remove any too old
  var oldest_frame = this.frames;
  var restoring = false;
  for (var user_id in this.players) {
    var actions = this.players[user_id].actions;
    for (var frame in actions) {
      var frame_int = parseInt(frame);
      if (frame_int + 20 < this.frames) {
        delete actions[frame];
        continue;
      }
      if (!actions[frame].done && frame_int < oldest_frame) {
        restoring = true;
        oldest_frame = frame_int;
      }
    }
  }
  frame_difference = frames - oldest_frame;

  // restore state of game if we have one
  var state = this.states[oldest_frame - 1];
  if (restoring && state) {
    this.core.state = this.core.unpack_state(state);
  } else {
    oldest_frame = this.frames;
  }

  // remove players from core
  for (var player_id in this.core.state.players) {
    if (!this.player_ids[parseInt(player_id)]) {
      // console.log("removed player | " + player_id);
      this.remove_core_player(player_id);
    }
  }

  // add players to the core
  for (var user_id in this.players) {
    var player_id = this.players[user_id].player_id;
    if (!this.core.state.players[player_id]) {
      // console.log("added player | " + player_id);
      this.start_core_player(player_id);
    }
  }

  // execute remaining frames
  for (var i = 0; i < frame_difference; i++) {
    this.frame_run(oldest_frame + i);
  }

  // send out response
  this.send_packets(this.states[this.frames]);

  // remove old states
  for (var frame in this.states) {
    if (parseInt(frame) + 20 < frames) {
      delete this.states[frame];
    }
  }

  // remove old drop positions
  for (var key in this.drop_positions) {
    if (this.drop_positions[key].frame + 20 < frames) {
      delete this.drop_positions[key];
    }
  }

  // remove player responses
  for (var id in this.players) {
    this.players[id].responses = [];
  }

  // remove player events
  for (var id in this.core.state.players) {
    this.core.state.players[id].events = [];
  }

  // increment frame count
  this.frames = frames;
};

/* Frame run
    ---------------------------------------- */

room.prototype.frame_run = function(frame) {
  // end the game
  if (this.scheme.time_limit && this.frames >= this.scheme.time_limit) {
    this.end_game();
    return;
  }

  // set core frame
  this.core.state.frame = frame;

  // do drops
  var counts = this.object_counts();
  for (var type in this.scheme.drops) {
    var time = this.scheme.drops[type].time;
    if (time < 1 || counts[type] >= this.scheme.drops[type].max) {
      continue;
    }
    if (frame % time === 0) {
      var props = { type: type };
      var key = frame + "-" + type;
      if (this.drop_positions[key]) {
        props.x = this.drop_positions[key].x;
        props.y = this.drop_positions[key].y;
      }
      var obj = this.core.spawn(props);
      this.drop_positions[key] = { x: obj.x, y: obj.y, frame: frame };
    }
  }

  // run player input
  for (var id in this.players) {
    var player = this.players[id];
    var event = player.actions[frame];
    if (!event) {
      continue;
    }
    player.responses.push(this.core.action(player.player_id, event));
    player.actions[frame].done = true;
  }

  // run core
  this.core.frame();

  // events from scheme
  var f_event = this.scheme.events.frame[frame];
  if (f_event) {
    this.run_event(f_event);
  }

  // run events
  this.run_event(this.core.state.events);

  // get game state
  this.states[frame] = this.core.pack_state(this.core.state);
};

/* Object counts
    ---------------------------------------- */

room.prototype.object_counts = function() {
  var counts = {};
  for (var key in this.core.state.objects) {
    var obj = this.core.state.objects[key];
    if (!counts[obj.type]) {
      counts[obj.type] = 0;
    }
    counts[obj.type]++;
  }
  return counts;
};
