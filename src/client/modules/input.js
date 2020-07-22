/* ========================================================================
	Input
 ========================================================================== */

function input(callback) {
  var self = this;
  this.callback = callback;

  this.cursor = { x: 0, y: 0 };
  this.onePress = false;
  this.twoPress = false;
  this.metaClick = false;
  this.waitingForDouble = false;
  this.doublePress = false;

  // mouse move
  document.body.onmousemove = function (e) {
    if (e.target.id === "game_input") {
      self.cursor.x = e.clientX;
      self.cursor.y = e.clientY;
    }
  };

  // double click/press
  function waitForDouble() {
    if (self.waitingForDouble) {
      self.doublePress = true;
      self.waitingForDouble = false;
      setTimeout(function () {
        self.doublePress = false;
      }, 20);
    } else {
      self.waitingForDouble = true;
    }
    setTimeout(function () {
      self.waitingForDouble = false;
    }, 300);
  }

  // mouse click
  document.body.onmousedown = function (e) {
    if (e.target.id === "game_input") {
      self.singlePress = true;
      waitForDouble();
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        self.metaClick = true;
      }
    }
  };
  document.body.onmouseup = function (e) {
    self.singlePress = false;
    self.twoFingerTap = false;
    self.metaClick = false;
  };

  // touch events
  document.body.ontouchstart = function (e) {
    if (e.target.id === "game_input") {
      self.cursor.x = e.touches[0].clientX;
      self.cursor.y = e.touches[0].clientY;

      // multi touch for shooting
      self.singlePress = e.touches.length === 1;
      self.twoFingerTap = !self.singlePress;

      waitForDouble();
    }
  };

  document.body.ontouchend = function (e) {
    self.singlePress = false;
    self.twoFingerTap = false;
    self.metaClick = false;
  };

  // set cursor when touches move
  document.body.ontouchmove = function (e) {
    if (e.target.id === "game_input") {
      self.cursor.x = e.touches[0].clientX;
      self.cursor.y = e.touches[0].clientY;
    }
  };

  // turn off input when window is not focused
  window.onblur = function () {
    self.singlePress = false;
    self.twoFingerTap = false;
    self.metaClick = false;
    self.waitingForDouble = false;
    self.doublePress = false;
  };

  this.active = function (type) {
    if (type === "jump" && self.doublePress) {
      return true;
    }
    if (type === "shoot" && (self.twoFingerTap || self.metaClick)) {
      return true;
    }
    if (type === "move" && self.singlePress) {
      return true;
    }
  };
}
