/* ========================================================================
    App
 ========================================================================== */

const shareLinksText =
  "<div class='links'><a target='_blank' class='fb ball' href='https://www.facebook.com/sharer/sharer.php?u=http://projectants.com' title='Share on Facebook'><img src='" +
  ASSETS +
  "/images/facebook.png' alt=''></a><a target='_blank' class='twitter ball' href='https://twitter.com/intent/tweet?status=Come%20and%20play%20http%3A%2F%2Fprojectants.com%20%23projectants' title='Share on Twitter'><img src='" +
  ASSETS +
  "/images/twitter.png' alt=''></a><br/><a target='_blank' href='mailto:projectantsgame@gmail.com'>Contact</a> | <a target='_blank' href='https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=projectantsgame@gmail.com&lc=UK&item_name=Keeping+the+ants+at+bay!&no_note=0&no_shipping=2&curency_code=GBP&bn=PP-DonationsBF:btn_donateCC_LG.gif:NonHosted'>Donate</a></div>";

const url = new URL(window.location);
const watch = !!url.searchParams.get("watch");

function app() {
  var self = this;
  this.assets_url = ASSETS;
  this.assets = {};
  this.started = false;
  this.watch = watch;
  this.nickname = "the watcher";

  this.sockets = new SocketConnection(function(event) {
    self.run_event(event);
  });
  this.init_interface();

  this.input = new input(function(event) {
    self.run_event(event);
  });
  this.audio = new audio();

  this.init_settings();

  if (this.watch) {
    this.load_room();
  } else {
    this.init_start();
  }
}

/* Load room
    ---------------------------------------- */

app.prototype.load_room = function() {
  if (this.start) {
    hide(this.start);
  }
  show(this.loading);

  // load assets
  var self = this;
  new loader(
    this.assets_url,
    {
      img: {
        sprites: "/images/sprites/sprites.png",
        bg: "/images/textures/space.jpg"
      },
      audio: {
        bleep1: "/audio/bleep1.mp3",
        bloop1: "/audio/bloop1.mp3",
        bloop2: "/audio/bloop2.mp3",
        bing: "/audio/bing.mp3",
        dig: "/audio/dig.mp3",
        doink: "/audio/doink.mp3",
        donk: "/audio/donk.mp3",
        explosion: "/audio/explosion.mp3",
        explosion_gas: "/audio/explosion_gas.mp3",
        explosion_laser: "/audio/explosion_laser.mp3",
        homing: "/audio/homing.mp3",
        fly: "/audio/fly.mp3",
        countdown: "/audio/countdown.mp3",
        jump: "/audio/jump.mp3",
        levelup: "/audio/levelup.mp3",
        locknload: "/audio/locknload.mp3",
        phase: "/audio/phase.mp3",
        pop: "/audio/pop.mp3",
        punch: "/audio/punch.mp3",
        shoot: "/audio/shoot.mp3",
        shoot_laser: "/audio/shoot_laser.mp3",
        throw: "/audio/throw.mp3",
        spooky: "/audio/spooky.mp3",
        walk: "/audio/walk.mp3"
      }
    },
    function(assets) {
      self.init_room(assets);
    }
  );
};

/* Start the app
    ---------------------------------------- */

app.prototype.init_room = function(assets) {
  hide(this.loading);

  this.started = true;
  this.assets = assets;
  this.audio.add_buffers(assets.audio);

  this.room = new multiplayer(
    this.assets,
    this.assets_url,
    this.audio,
    this.input,
    this.nickname,
    this.watch,
    this.run_event,
    this.sockets,
    new onboarding()
  );
  append(this.div, this.room.div);

  if (this.watch) {
    this.sockets.message_send("watcher", []);
  } else {
    this.nickname = this.check_name(this.nickname);
    this.sockets.message_send("send_name", [this.nickname]);
  }
};

window.onload = function() {
  new app();
};
