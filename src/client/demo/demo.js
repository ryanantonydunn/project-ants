/* ========================================================================
    Missions
 ========================================================================== */

function demo(assets, assets_url, audio, input, name) {
  // setup
  this.assets = assets;
  this.assets_url = assets_url;
  this.audio = audio;
  this.input = input;
  this.name = name;
  this.active = false;
  this.player_id = 0;
  this.players_ref = {
    "0": {
      user_id: 0,
      name: name,
      level: 0
    }
  };
  this.scheme = deepmerge(schemes.default, schemes.deathmatch);
  this.div = element({ class: "full" });

  var self = this;
  new loader(
    this.assets_url,
    {
      img: {
        edge: "/images/sprites/edge.png",
        decorations: "/images/sprites/decorations.png",
        dirt: "/images/textures/dirt.png",
        rock: "/images/textures/rock.png"
      }
    },
    function(assets) {
      self.loaded(assets.img);
    }
  );
}

/* Start demo
---------------------------------------- */

demo.prototype.loaded = function(img) {
  // get the map
  this.map = new mapgen(img, config.mapgen, this.scheme.mapgen);
  this.map.fg.cont.globalCompositeOperation = "destination-out";

  // start up game object
  this.game = new game(
    this.assets,
    this.audio,
    this.input,
    this.scheme,
    this.map,
    this.players_ref,
    this.player_id
  );
  append(this.div, this.game.div);

  this.game.core.create_player({ id: this.player_id });
  this.game.core.create_object({ type: "player", player_id: this.player_id });
  this.game.core.init_player(this.player_id);

  this.game.start(0);
  this.game.player.armoury = duplicate_obj(
    this.game.core.state.players[this.player_id].armoury
  );
  this.game.set_armoury();

  this.loop_start();
};
