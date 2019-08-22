/* ========================================================================
    App
    Start Screen
 ========================================================================== */

app.prototype.init_start = function() {
  var self = this;

  // get a new or stored nickname
  this.nickname = config.names[rand(0, config.names.length - 1)];
  if (typeof Storage !== "undefined") {
    var lsname = localStorage.getItem("pants_nn");
    if (config.names.indexOf(lsname) === -1) {
      this.nickname = lsname || this.nickname;
    }
  }

  this.start = element({ class: "start" });
  var logo = element({
    type: "img",
    class: "logo",
    src: this.assets_url + "/images/logo.png"
  });
  var instructions = element({
    type: "ul",
    class: "fade",
    text:
      "<li>Collect gems to get stronger</li><li>Destroy the enemy to get their gems!</li><li>Click to Move</li><li>Alt + Click or Right Click to Shoot</li>"
  });
  this.input_name = element({
    type: "input",
    intype: "text",
    value: this.nickname,
    maxlength: 20
  });
  this.button_start = element({
    type: "button",
    class: "break",
    text: "Play Now"
  });

  append(this.div, this.start);
  append(this.start, logo);
  append(this.start, instructions);
  append(this.start, this.input_name);
  append(this.start, this.button_start);

  // start up the app
  this.button_start.onclick = function() {
    self.load_room();
  };
};

/* Check name
    ---------------------------------------- */

app.prototype.check_name = function() {
  var new_name = this.nickname;
  if (this.input_name) {
    new_name = this.input_name.value;
  }
  new_name = new_name.length > 20 ? new_name.substring(0, 20) : new_name;
  if (typeof Storage !== "undefined") {
    localStorage.setItem("pants_nn", new_name);
  }
  return new_name;
};
