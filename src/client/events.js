/* ========================================================================
    App
    Events
 ========================================================================== */

/* Events
    ---------------------------------------- */

app.prototype.run_event = function(event) {
  if (Array.isArray(event)) {
    for (var i = 0; i < event.length; i++) {
      this.run_event(event[i]);
    }
    return;
  }

  // show and hide menu
  if (event.type == "show_menu") {
    show(this.menu);
  } else if (event.type == "hide_menu") {
    hide(this.menu);

    // if game is full
  } else if (event.type === "full") {
    hide(this.loading);
    show(this.game_full);
    if (this.room && this.room.connecting) {
      hide(this.room.connecting);
    }

    // show the controls screen
  } else if (event.type == "show_settings") {
    this.toggle_settings_screen();

    // send event down a level
  } else {
    if (this.room) {
      this.room.run_event(event);
    }
  }
};
