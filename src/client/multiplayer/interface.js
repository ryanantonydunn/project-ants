/* ========================================================================
    Multiplayer
    Interface
 ========================================================================== */

/* Init interface
    ---------------------------------------- */

multiplayer.prototype.init_interface = function() {
  // loading screen
  this.loading = element({
    class: "cont_center",
    text: "Loading...<br><br><div class='loader'></div>"
  });
  append(this.div, this.loading);
  hide(this.loading);

  // between games screen
  this.between_games = element({
    class: "cont_center",
    text: "Dimension jump in progress!<br><br><div class='loader'></div>"
  });
  append(this.div, this.between_games);
  hide(this.between_games);

  // performance
  this.div_ping = element({ class: "ping" });
  this.div_fps = element({ class: "fps" });
  append(this.div, this.div_ping);
  append(this.div, this.div_fps);

  // dead div
  this.div_dead = element({ class: "full full_bg" });
  this.div_dead_cont = element({
    class: "cont_center red",
    text: "<h3>You have died!</h3>" + shareLinksText
  });
  this.div_dead_text = element({
    type: "p",
    text: "You were killed in action."
  });
  this.div_dead_countdown = element({ type: "p", class: "grey" });
  this.div_dead_buttons = element({ class: "buttons" });
  this.button_respawn = element({
    type: "button",
    class: "button red disabled",
    text: "Respawn"
  });
  append(this.div, this.div_dead);
  append(this.div_dead, this.div_dead_cont);
  append(this.div_dead_cont, this.div_dead_text);
  append(this.div_dead_cont, this.div_dead_countdown);
  append(this.div_dead_cont, this.div_dead_buttons);
  append(this.div_dead_buttons, this.button_respawn);
  hide(this.div_dead);

  // game full screen
  this.full = element({
    class: "cont_center",
    text:
      "Game server full. Please try again later...<br><br><div class='loader'></div>"
  });
  append(this.div, this.full);
  hide(this.full);

  // respawn on click
  var self = this;
  this.button_respawn.onclick = function() {
    if (self.wait_for_respawn === 0) {
      self.sockets.message_send("respawn", []);
    }
  };

  // players
  this.div_players = element({ class: "players" });
  this.table_players = element({ type: "table" });
  append(this.div, this.div_players);
  append(this.div_players, this.table_players);
};
