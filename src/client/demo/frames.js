/* ========================================================================
    Mulitplayer
    Frames
 ========================================================================== */

/* Start/stop loop
    ---------------------------------------- */

demo.prototype.loop_start = function(start_frame) {
  // close any open loops
  this.loop_stop();

  // set loop vars
  this.start_frame = start_frame || 0;
  this.frames = this.start_frame;
  this.start_time = new Date().getTime();
  this.drop_positions = {};

  var self = this;
  this.interval = setInterval(function() {
    self.frame();
  }, 24);
};

demo.prototype.loop_stop = function() {
  clearInterval(this.interval);
};

/* Frame process
---------------------------------------- */

demo.prototype.frame = function() {
  this.frames++;

  // do drops
  var counts = this.object_counts();
  for (var type in this.scheme.drops) {
    var time = this.scheme.drops[type].time;
    if (time < 1 || counts[type] >= this.scheme.drops[type].max) {
      continue;
    }
    if (this.frames % time === 0) {
      var props = { type: type };
      var obj = this.game.core.spawn(props);
      this.game.create_object(obj);
    }
  }

  // check for level ups
  for (var id in this.players_ref) {
    var player = this.players_ref[id];
    var core_player = this.game.core.state.players[id];
    if (!core_player) {
      continue;
    }
    if (player.level !== core_player.level) {
      this.run_event({
        type: "player_level",
        id: parseInt(id),
        prev: player.level,
        new: core_player.level
      });
      this.players_ref[id].level = core_player.level;
    }
  }

  var action = this.game.player && this.game.get_input();
  this.game.frame_core(this.frames, action);
  this.run_event(this.game.core.state.events);
  this.game.frame_display();
};

/* Object counts
    ---------------------------------------- */

demo.prototype.object_counts = function() {
  var counts = {};
  for (var key in this.game.core.state.objects) {
    var obj = this.game.core.state.objects[key];
    if (!counts[obj.type]) {
      counts[obj.type] = 0;
    }
    counts[obj.type]++;
  }
  return counts;
};
