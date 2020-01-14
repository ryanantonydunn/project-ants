/* ========================================================================
    App
    Settings
 ========================================================================== */

/* Start settings screen
    ---------------------------------------- */

app.prototype.init_settings = function() {
  var self = this;

  // audio button
  this.icon_settings = element({
    class: "settings_1",
    text: "🔉"
  });
  this.icon_settings.onclick = function() {
    if (self.audio.volume === 0) {
      self.audio.set_global_volume(0.1);
      self.icon_settings.innerHTML = "🔉";
    } else {
      self.audio.set_global_volume(0);
      self.icon_settings.innerHTML = "🔇";
    }
  };
  append(this.div, this.icon_settings);

  // fullscreen
  this.icon_settings_fullscreen = element({
    class: "settings_2",
    type: "img",
    src: this.assets_url + "/images/fullscreen.png"
  });
  append(this.div, this.icon_settings_fullscreen);
  this.icon_settings_fullscreen.onclick = function() {
    var isFullscreen = document.fullscreenElement !== null;
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      document.body.requestFullscreen();
    }
  };
};
