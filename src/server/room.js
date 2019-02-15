/* ========================================================================
    Room
 ========================================================================== */

/* Start room
    ---------------------------------------- */

function room() {
  var self = this;
  this.status = "loading";
  this.lag = 0;

  // set constants
  this.max_players = PLAYER_LIMIT;
  this.min_players = 1;
  this.between_game_time = 5000;

  // loop
  this.fps = 24;
  this.ms_loop = Math.floor(1000 / this.fps);
  this.tick_frames = 6;

  // active values
  this.watcher_count = 0;
  this.watchers = {};
  this.player_count = 0;
  this.players = {};
  this.player_ids = new Array(this.max_players).fill(null);

  // start working messages
  this.init_messages();

  // get config files
  this.c = config;

  // load images
  const images = {
    edge: "/images/sprites/edge.png",
    decorations: "/images/sprites/decorations.png",
    dirt: "/images/textures/dirt.png",
    rock: "/images/textures/rock.png"
  };
  let loaded = 0;
  const imgCount = Object.keys(images).length;

  // go through all images and load
  this.img = {};
  for (key in images) {
    const newImg = new canvas.Image();
    newImg.onload = function() {
      loaded++;
      if (loaded >= imgCount) {
        self.loaded();
      }
    };
    newImg.src = __dirname + "/assets" + images[key];
    this.img[key] = newImg;
  }
}

/* Images all loaded
    ---------------------------------------- */

room.prototype.loaded = function() {
  // set scheme
  this.scheme = deepmerge(schemes.default, schemes[SCHEME], {
    arrayMerge: dont_merge
  });

  // wait for game
  this.status = "waiting";

  // try to start
  this.start_game_try();
};

/* Start game if there are enough players
    ---------------------------------------- */

room.prototype.start_game_try = function() {
  if (this.status === "loading" || this.status === "active") {
    return;
  }
  if (this.player_count >= this.min_players) {
    this.start_game();
  } else {
    this.wait_game();
  }
};

/* Reset game and start loading new map
    ---------------------------------------- */

room.prototype.start_game = function() {
  // reset game
  this.frames = 0;
  this.drops = {};

  // load map image if there is one
  if (this.scheme.mapgen.type == "random") {
    this.start_game_loaded();
  } else if (this.scheme.mapgen.type == "image") {
    var self = this;
    var img = new canvas.Image();
    img.onload = function() {
      self.start_game_loaded(this);
    };
    img.src = __dirname + "/" + this.scheme.mapgen.src;
  }
};

/* Start the new game once map is loaded
    ---------------------------------------- */

room.prototype.start_game_loaded = function(map_img) {
  // get the map
  this.map = new mapgen(this.img, this.c.mapgen, this.scheme.mapgen, map_img);
  this.map.fg.cont.globalCompositeOperation = "destination-out";

  // create core
  this.core = new core(this.c, this.scheme, this.map.fg);
  this.core.state = this.core.blank_state();
  this.gravity_map = JSON.stringify(this.core.map.gravity.map);

  // reset state
  this.frames = 0;
  this.states = {};
  this.events = {};
  this.drop_positions = {};
  this.damaged_ground_all = {};
  this.damaged_ground_send = {};

  // start players
  for (var user_id in this.players) {
    var player = this.players[user_id];
    player.actions = {};
    this.start_core_player(player.player_id, player.state);
  }

  // send message to all players with game data
  var fg_str = this.map.fg.canv.toDataURL();
  this.bg_str = this.map.bg.canv.toDataURL();
  this.message_all_players("game_start", [
    1,
    this.bg_str,
    fg_str,
    this.gravity_map
  ]);

  // send message to all watchers
  for (var user_id in this.watchers) {
    this.message_send(this.watchers[user_id], "game_start", [
      1,
      this.bg_str,
      fg_str,
      this.gravity_map
    ]);
  }

  // start the game
  this.status = "active";
  this.loop_start();
};

/* Emd the game
    ---------------------------------------- */

room.prototype.end_game = function(player_left) {
  this.loop_stop();
  this.status = "ended";

  // get all player states
  for (user_id in this.players) {
    var player = this.players[user_id];
    var core_player = this.core.state.players[player.player_id];
    if (!core_player) {
      continue;
    }
    player.state = {
      id: core_player.id,
      level: core_player.level,
      score: core_player.score,
      health: core_player.health,
      dead: core_player.dead,
      weapon: core_player.weapon,
      armoury: duplicate_obj(core_player.armoury)
    };
  }

  // send message to players
  if (player_left) {
    this.message_all_players("opponent_lost", []);
  } else {
    this.message_all_players("game_end");
  }

  this.start_game_try();
};

/* Wait game
    ---------------------------------------- */

room.prototype.wait_game = function() {
  this.message_all_players("game_wait", []);
  this.status = "waiting";
};

/* Send game state from a frame to a player
    ---------------------------------------- */

room.prototype.send_packets = function(state) {
  // prep damaged ground
  var damages = [];
  for (var key in this.damaged_ground_send) {
    var damage = this.damaged_ground_send[key];
    var dig = damage.dig ? "1" : "";
    var arr = [damage.frame, damage.x, damage.y, damage.radius, dig];
    damages.push(arr.join("~"));
  }
  damages = damages.join("$");
  this.damaged_ground_send = {};

  // send it to players
  for (user_id in this.players) {
    // prep action responses
    var responses = [];
    for (var i = 0; i < this.players[user_id].responses.length; i++) {
      var r = this.players[user_id].responses[i];
      var success = r.success ? "1" : "";
      var arr = [r.frame, success, r.x, r.y, r.speed_x, r.speed_y, r.type];
      responses.push(arr.join("~"));
    }
    responses = responses.join("$");

    // send it
    this.message_send(this.players[user_id], "game_state", [
      this.frames,
      state,
      responses,
      damages
    ]);
  }

  // send it to watchers
  for (user_id in this.watchers) {
    this.message_send(this.watchers[user_id], "game_state", [
      this.frames,
      state,
      [],
      damages
    ]);
  }
};

/* Send Message to All Players
    ---------------------------------------- */

room.prototype.message_all_players = function(type, props, omit) {
  for (user_id in this.players) {
    // ignore omitted user id
    if (user_id == omit) {
      continue;
    }

    // send the message
    var client = this.players[user_id];
    this.message_send(client, type, props);
  }
};
