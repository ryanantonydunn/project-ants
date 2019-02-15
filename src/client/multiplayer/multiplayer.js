/* ========================================================================
    App
 ========================================================================== */

function multiplayer(
  assets,
  assets_url,
  audio,
  input,
  name,
  watcher,
  run_event,
  sockets,
  onboarding
) {
  // setup
  this.assets = assets;
  this.assets_url = assets_url;
  this.audio = audio;
  this.input = input;
  this.name = name;
  this.watcher = watcher;
  this.top_event = run_event;
  this.sockets = sockets;
  this.scheme = null;
  this.lag = 0;
  this.onboarding = onboarding;

  // loop
  this.fps = 24;
  this.ms_loop = Math.floor(1000 / this.fps);
  this.ms_tick = 10;
  this.active = false;

  // main divs
  this.div = element({ class: "full" });
  this.connecting = element({
    class: "cont_center",
    text: "Waiting for connection...<br><br><div class='loader'></div>"
  });
  append(this.div, this.connecting);

  // set up interface
  this.init_interface();

  // when joining a game record any incoming events for later use
  this.initial_game_events = [];
}

/* Wait for connection
    ---------------------------------------- */

multiplayer.prototype.wait_for_connection = function(event) {
  this.loop_stop();
  hide(this.between_games);
  hide(this.loading);
  hide(this.div_dead);
  show(this.connecting);
};

/* Connected
    ---------------------------------------- */

multiplayer.prototype.connected = function(event) {
  // set up scheme
  this.scheme = deepmerge(schemes.default, schemes[event.scheme]);

  // active values
  this.name = event.name;
  this.player_id = event.player_id;
  this.player_count = 0;
  this.players = {};
  this.players_ref = {};

  // go through string of players
  var split = event.players.split("+");
  for (var i = 0; i < split.length; i++) {
    var split2 = split[i].split("/");
    this.init_player({
      user_id: split2[0],
      name: split2[1],
      player_id: parseInt(split2[2])
    });
  }

  // run the player interface
  this.players_interface();
};

/* Start game
    ---------------------------------------- */

multiplayer.prototype.game_start = function(event) {
  this.loading_start = true;
  this.initialised = false;
  this.gravity_map = event.gravity_map;

  this.game_close();

  // reset scores
  if (event.reset_players) {
    for (var id in this.players) {
      this.players[id].level = 0;
      this.players[id].score = 0;
    }
    this.players_interface();
  }

  // stored game states and actions
  this.store_packet = {};
  this.store_state = {};
  this.store_input = {};
  this.store_responses = [];

  // ground damage
  this.ground_temp = {};
  this.ground_events = {};

  // objects that we are waiting on for server confirmation
  this.wait_to_destroy = {};
  this.wait_to_create = {};

  // performance
  this.pings = {};
  this.fpses = [];

  // load the map from data url
  var self = this;
  new loader(
    "",
    {
      img: {
        bg: event.bg_str,
        fg: event.fg_str
      }
    },
    function(assets) {
      self.game_start_loaded(assets.img);
    }
  );
};

multiplayer.prototype.game_start_loaded = function(map) {
  // set up map
  var new_map = {
    fg: mapgen_canvas(map.fg.width, map.fg.height),
    bg: mapgen_canvas(map.bg.width, map.bg.height),
    gravity_map: this.gravity_map
  };
  new_map.fg.cont.drawImage(map.fg, 0, 0);
  new_map.bg.cont.drawImage(map.bg, 0, 0);

  // start up game object
  this.game = new game(
    this.assets,
    this.audio,
    this.input,
    this.scheme,
    new_map,
    this.players_ref,
    this.player_id,
    this.top_event,
    this.onboarding
  );
  append(this.div, this.game.div);

  // finished loading
  this.loading_start = false;
};

/* Init game
    ---------------------------------------- */

multiplayer.prototype.init_game = function(event) {
  if (!this.game || !this.game.core) {
    return;
  }

  // show interface
  hide(this.between_games);
  hide(this.div_dead);
  hide(this.connecting);
  hide(this.loading);

  // stop game
  this.loop_stop();

  // prepare state
  this.set_game_state(event, true);

  // start game
  this.game.start(event.frames);
  this.status = "active";

  // last frame a server packet was received
  this.last_packet = event.frames;
  this.disconnected = false;

  // run initial events
  this.run_event(this.initial_game_events);
  this.initial_game_events = [];
  this.initialised = true;

  // start loop
  this.loop_start(event.frames);
};

/* Close game
    ---------------------------------------- */

multiplayer.prototype.game_close = function(event) {
  this.loop_stop();
  if (this.game) {
    remove(this.game.div);
    delete this.game;
  }
};

/* End Game
    ---------------------------------------- */

multiplayer.prototype.game_end = function(event) {
  // stop game
  this.loop_stop();

  // stop audio
  this.audio.stop();

  // show loading screen
  hide(this.loading);
  hide(this.div_dead);
  hide(this.connecting);
  show(this.between_games);
};

/* Send input to server
    ---------------------------------------- */

multiplayer.prototype.send_input = function(action) {
  var arr = [this.frames, action.action, action.angle];
  if (action.action === "shoot") {
    arr.push(action.weapon);
  }
  this.sockets.message_send("player_input", arr);
};
