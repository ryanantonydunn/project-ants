/* ========================================================================
    Game
 ========================================================================== */

function game(
  assets,
  audio,
  input,
  scheme,
  map,
  players,
  player_id,
  top_event,
  onboarding
) {
  // args
  this.c = config;
  this.img = assets.img;
  this.audio = audio;
  this.input = input;
  this.scheme = scheme;
  this.map = map;
  this.players = players;
  this.player_id = player_id;
  this.leader = null;
  this.top_event = top_event;
  this.onboarding = onboarding;

  // game running
  this.active = false;
  this.last_frame = 0;

  // main div
  this.div = element({ class: "game full" });
  this.game_area = element({ id: "game_input" });
  append(this.div, this.game_area);

  // set up game modules
  this.init_crosshair();
  this.init_canvas();
  this.init_armoury();
  this.init_map();
  this.init_camera();
  this.init_background();
  this.init_time();
  this.init_score();
  this.init_alert();
  this.init_audio();

  // things to display
  this.objects = {};
  this.explosions = {};
  this.decorations = {};
  this.actions = {};
  this.sprites = [];
  this.messages = [];
  this.labels = {};

  // wait period before on fired weapon immediately after
  this.detonation_cooldown = 0;

  // create core
  this.core = new core(this.c, this.scheme, this.map.fg, this.map.gravity_map);
  this.core.state = this.core.blank_state();
  this.core.state = this.core.state;
}

/* Init game
    ---------------------------------------- */

game.prototype.start = function(frame) {
  // mark player events
  this.player_events = {};

  // set game status to active
  this.active = true;

  // set player obj
  this.set_this_player_refs();
  this.set_score();

  // set initial camera
  if (this.player) {
    this.camera.x = this.player_obj.x;
    this.camera.y = this.player_obj.y;
  }
};

/* Run core
    ---------------------------------------- */

game.prototype.frame_core = function(frame, actions) {
  // set up this state
  this.core.state.frame = frame;
  this.core.state.events = [];
  var response = this.core.action(this.player_id, actions);

  // run player actions
  this.run_players_events();

  // run this state
  this.core.frame();

  // return the input response
  return response;
};

/* Run display
    ---------------------------------------- */

game.prototype.frame_display = function() {
  this.run_objects();
  this.run_crosshair();
  this.run_camera();
  this.run_explosions();
  this.run_decorations();
  this.run_labels();
  this.run_canvas();
  this.run_audio();
  this.run_time();
  this.run_alert();
  this.run_armoury();

  // detonation cooldown
  this.detonation_cooldown -= this.detonation_cooldown > 0 ? 1 : 0;
};
