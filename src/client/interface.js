/* ========================================================================
    App Interface
 ========================================================================== */

app.prototype.init_interface = function() {
  var self = this;
  this.div = element({ id: "projectants", class: "app" });
  append(document.body, this.div);

  // game full
  this.game_full = element({
    class: "cont_center",
    text: "Oh dear, this room is very full!<br><br><br></div>"
  });
  this.button_new_game = element({
    type: "button",
    class: "button red",
    text: "Find A New One"
  });
  append(this.div, this.game_full);
  append(this.game_full, this.button_new_game);
  hide(this.game_full);

  // find new room
  this.button_new_game.onclick = function() {
    window.location = "/";
  };

  setDimensions(this.div);
  window.addEventListener("resize", function() {
    console.log("yes");
    setDimensions(self.div);
  });

  // loading
  this.loading = element({
    class: "cont_center",
    text: "Loading...<br><br><div class='loader'></div>"
  });
  append(this.div, this.loading);
  hide(this.loading);
};

// limit game aspect ratio
function setDimensions(div) {
  var ratio = document.body.offsetWidth / document.body.offsetHeight;
  div.style.width =
    ratio > 1.8
      ? round(document.body.offsetHeight * 1.8) + "px"
      : document.body.offsetWidth + "px";
  div.style.height =
    ratio < 1 ? document.body.offsetWidth + "px" : document.body.offsetHeight + "px";
}
