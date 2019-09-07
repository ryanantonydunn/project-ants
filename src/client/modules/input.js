/* ========================================================================
	Input
 ========================================================================== */

function input(callback) {
  var self = this;
  this.callback = callback;

  // default action keys
  this.action_keys = {
    move: ["0"], // click
    shoot: ["2", ["0", "17"], ["0", "18"], ["0", "91"]], // click, ctrl, alt, cmd
    jump: ["32"], // space
    switch_watcher_camera: ["80"], // p
    follow_weapon: ["70"], // f
    follow_mouse: ["1"], // middle click
    // move_left: ["37", "65"], // left, a
    // move_up: ["38", "87"], // up, w
    // move_right: ["39", "68"], // right, d
    // move_down: ["40", "83"], // down, s
    show_settings: ["27", "13"], // esc, enter
    weapon_select_1: ["49"], // 1
    weapon_select_2: ["50"], // 2
    weapon_select_3: ["51"], // 3
    weapon_select_4: ["52"], // 4
    weapon_select_5: ["53"], // 5
    weapon_select_6: ["54"], // 6
    weapon_select_7: ["55"], // 7
    weapon_select_8: ["56"], // 8
    weapon_select_9: ["57"] // 9
  };

  // set up reference for pressed key codes
  this.key_codes = {};

  // cursor
  this.cursor_moved = false;
  this.cursor = { x: 0, y: 0 };

  // set cursor points
  document.body.onmousemove = function(e) {
    if (e.target.id === "game_input") {
      self.input_cursor(e.clientX, e.clientY);
    }
  };

  // prevent default right click behaviour
  document.body.oncontextmenu = function(e) {
    e.preventDefault();
    return false;
  };

  // manage click events
  document.body.onmousedown = function(e) {
    if (e.target.id === "game_input") {
      self.input_button(e.button, "down");
    }
    if (e.button == 1) {
      e.preventDefault();
      return false;
    }
  };
  document.body.onmouseup = function(e) {
    self.input_button(e.button, "up");
  };

  this.oneFingerTap = false;
  this.twoFingerTap = false;
  this.waitingForDouble = false;
  this.doubleTapped = false;

  document.body.ontouchstart = function(e) {
    if (e.target.id === "game_input") {
      var touch = e.touches[0];
      self.input_cursor(touch.clientX, touch.clientY);
      self.oneFingerTap = (e.touches.length === 1);
      self.twoFingerTap = !self.oneFingerTap;
      if (self.waitingForDouble) {
          self.doubleTapped = true;
          self.waitingForDouble = false;
          setTimeout(function() {
            self.doubleTapped = false;
          }, 20);
      } else {
        self.waitingForDouble = true;
      }
      setTimeout(function() {
        self.waitingForDouble = false;
      }, 300);
    }
  }

  document.body.ontouchend = function(e) {
    self.oneFingerTap = false;
    self.twoFingerTap = false;
  }

  document.body.ontouchmove = function(e) {
    if (e.target.id === "game_input") {
      var touch = e.touches[0];
      self.input_cursor(touch.clientX, touch.clientY);
    }
  }

  // self.input_cursor(e.clientX, e.clientY);

  // manage touch events


  // mouse wheel
  // if ("onmousewheel" in document.body) {
  //   document.body.onmousewheel = function(e) {
  //     e.preventDefault && e.preventDefault();
  //     e.returnValue = false;
  //     e = e || window.event;
  //     self.scroll_wheel(e);
  //     return false;
  //   };
  // } else {
  //   document.body.addEventListener("DOMMouseScroll", function(e) {
  //     self.scroll_wheel(e);
  //   });
  // }

  // manage keyboard events
  document.body.onkeydown = function(e) {
    self.input_button(e.keyCode, "down");
  };
  document.body.onkeyup = function(e) {
    self.input_button(e.keyCode, "up");
  };

  // turn off input when window is not focused
  window.onblur = function() {
    self.input_reset();
  };
}

/* Is an action active
	---------------------------------------- */

input.prototype.active = function(type) {
  // touch
  if (type === 'jump' && this.doubleTapped) {
    return true;
  }
  if (type === 'shoot' && this.twoFingerTap) {
    return true;
  }
  if (type === 'move' && this.oneFingerTap) {
    return true;
  }

  // mouse keyboard
  const action = this.action_keys[type];
  if (!action) {
    return;
  }
  for (let i = 0; i < action.length; i++) {
    const codes = action[i];
    if (Array.isArray(codes)) {
      let trigger = true;
      for (let i2 = 0; i2 < codes.length; i2++) {
        const code = codes[i2];
        if (!this.key_codes[code]) {
          trigger = false;
        }
      }
      if (trigger) {
        return true;
      }
    } else {
      if (this.key_codes[codes]) {
        return true;
      }
    }
  }
};

/* Find the action of a code
	---------------------------------------- */

input.prototype.find_action = function(code) {
  const actions = [];
  for (let key in this.action_keys) {
    for (let i = 0; i < this.action_keys[key].length; i++) {
      const codes = this.action_keys[key][i];
      if (!Array.isArray(codes) && String(codes) === String(code)) {
        const obj = { type: key };
        // if (key == "show_settings") {
        //   if (this.actions.shoot) {
        //     return [];
        //   }
        // }

        // please don't tell anybody I did this
        if (key == "weapon_select_1") {
          obj.type = "weapon_select";
          obj.n = 0;
        }
        if (key == "weapon_select_2") {
          obj.type = "weapon_select";
          obj.n = 1;
        }
        if (key == "weapon_select_3") {
          obj.type = "weapon_select";
          obj.n = 2;
        }
        if (key == "weapon_select_4") {
          obj.type = "weapon_select";
          obj.n = 3;
        }
        if (key == "weapon_select_5") {
          obj.type = "weapon_select";
          obj.n = 4;
        }
        if (key == "weapon_select_6") {
          obj.type = "weapon_select";
          obj.n = 5;
        }
        if (key == "weapon_select_7") {
          obj.type = "weapon_select";
          obj.n = 6;
        }
        if (key == "weapon_select_8") {
          obj.type = "weapon_select";
          obj.n = 7;
        }
        if (key == "weapon_select_9") {
          obj.type = "weapon_select";
          obj.n = 8;
        }
        actions.push(obj);
      }
    }
  }
  return actions;
};

/* Process input events
	---------------------------------------- */

input.prototype.input_button = function(code, type) {
  // ignore input on a text box
  if (document.activeElement.tagName.toLowerCase() === "input") {
    return;
  }

  if (type == "up") {
    this.key_codes[code] = false;
  }
  if (type == "down") {
    this.key_codes[code] = true;
    const actions = this.find_action(code);
    for (let i = 0; i < actions.length; i++) {
      this.callback(actions[i]);
    }
  }
};

/* Cursor move
    ---------------------------------------- */

input.prototype.input_cursor = function(x, y) {
  this.cursor_moved = true;
  this.cursor.x = x;
  this.cursor.y = y;
};

/* Scroll wheel
    ---------------------------------------- */

input.prototype.scroll_wheel = function(e) {
  // normalize delta for cross browser
  var d = e.detail,
    w = e.wheelDelta,
    d = d ? (w && (f = w / d) ? d / f : -d / 1.35) : w / 120;

  // up or down
  var down = d < 0 ? true : false;

  // event
  this.callback({ type: "weapon_scroll", down: down });
};

/* Reset actions
    ---------------------------------------- */

input.prototype.input_reset = function() {
  for (key in this.key_codes) {
    this.key_codes[key] = false;
  }
};
