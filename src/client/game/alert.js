/* ========================================================================
    Game
    Alert Messages
 ========================================================================== */

/* Set up alert div
    ---------------------------------------- */

game.prototype.init_alert = function() {
  this.div_alert = element({ class: "alert" });
  append(this.div, this.div_alert);
  this.alert_text = "";
  this.alert_count = 0;
};

/* Set alert
    ---------------------------------------- */

game.prototype.set_alert = function(text, col, count) {
  this.alert_count = count || 60;
  this.div_alert.className = "alert";
  this.div_alert.innerHTML = text;
  if (col) {
    add_class(this.div_alert, col);
  }
  show(this.div_alert);
};

/* Run alert
    ---------------------------------------- */

game.prototype.run_alert = function() {
  // do countdowns
  if (this.alert_count > 0) {
    this.alert_count--;
    if (this.alert_count == 0) {
      this.div_alert.innerHTML = "";
      hide(this.div_alert);
    }
  }
};
