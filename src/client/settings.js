/* ========================================================================
    App
    Settings
 ========================================================================== */

/* Start settings screen
    ---------------------------------------- */

app.prototype.init_settings = function() {
  var self = this;

  // corner button
  this.icon_settings = element({ class: "settings" });
  this.icon_settings_img = element({
    type: "img",
    src: this.assets_url + "/images/cog.png"
  });
  append(this.div, this.icon_settings);
  append(this.icon_settings, this.icon_settings_img);

  this.settings_visible = false;
  this.icon_settings.onclick = function() {
    self.toggle_settings_screen();
  };

  // box
  this.div_settings = element({ class: "full full_bg" });
  this.div_settings_cont = element({
    class: "cont_center div_controls",
    text: "<div class='top_message'>Settings</div>"
  });
  append(this.div, this.div_settings);
  append(this.div_settings, this.div_settings_cont);
  hide(this.div_settings);

  // volume
  this.div_volume = element({ text: "<h2>Volume</h2>" });
  this.input_volume = element({ type: "input" });
  this.input_volume.type = "range";
  this.input_volume.setAttribute("min", 0);
  this.input_volume.setAttribute("max", 1);
  this.input_volume.setAttribute("step", 0.1);
  this.input_volume.value = this.audio.volume;
  append(this.div_settings_cont, this.div_volume);
  append(this.div_volume, this.input_volume);

  this.input_volume.onchange = function(e) {
    self.audio.set_global_volume(this.value);
  };

  // controls
  var ctext = "<h2>Controls</h2>";
  ctext += "<dl>";
  ctext += "<dt>Move</dt><dd>Left Click</dd>";
  ctext += "<dt>Jump</dt><dd>Spacebar</dd>";
  ctext += "<dt>Shoot</dt><dd>Right Click / Alt + Left Click</dd>";
  ctext += "<dt>Select Weapon</dt><dd>1-9 / Scroll Wheel</dd>";
  ctext += "<dt>Follow Weapons</dt><dd>F</dd>";
  ctext += "<dt>Free Cam</dt><dd>Middle Click</dd>";
  ctext += "</dl>";
  this.div_controls = element({ text: ctext });
  append(this.div_settings_cont, this.div_controls);

  // server
  this.div_server = element({
    text:
      "<h2>Server</h2><p><a href='http://uk.projectants.com/'>UK</a> | <a href='http://us.projectants.com/'>US</a></p>"
  });
  append(this.div_settings_cont, this.div_server);

  // close button
  this.div_settings_buttons = element({ class: "buttons" });
  this.button_close_settings = element({ type: "button", text: "Close" });
  append(this.div_settings_cont, this.div_settings_buttons);
  append(this.div_settings_buttons, this.button_close_settings);

  this.button_close_settings.onclick = function() {
    self.settings_visible = false;
    hide(self.div_settings);
  };
};

app.prototype.toggle_settings_screen = function() {
  if ((this.settings_visible = !this.settings_visible)) {
    this.audio.play("bleep1", 0.8);
    show(this.div_settings);
  } else {
    hide(this.div_settings);
  }
};
