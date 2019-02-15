/* ========================================================================
    Game
    Object Labels
 ========================================================================== */

/* Manage labels
	---------------------------------------- */

game.prototype.run_labels = function() {
  // create labels
  for (key in this.core.state.objects) {
    var obj = this.core.state.objects[key];
    if (obj.c.labels && !this.labels[key]) {
      this.labels[key] = {};
      for (type in obj.c.labels) {
        if (obj.c.labels[type]) {
          this.create_label(this.labels[key], type, key);
        }
      }
    }
  }

  // run through labels
  for (key in this.labels) {
    var obj = this.core.state.objects[key];
    if (!obj) {
      delete this.labels[key];
      continue;
    }
    for (type in this.labels[key]) {
      this.set_label(this.labels[key][type], obj);
    }
  }
};

/* Create label
	---------------------------------------- */

game.prototype.create_label = function(ref, type, key) {
  // check health is active
  if (type === "player_health" && !this.scheme.health) {
    return;
  }

  // create and add to ref object
  var canv = element({ type: "canvas" });
  var cont = canv.getContext("2d");
  ref[type] = { canv: canv, cont: cont, text: "", key: key, type: type };
};

/* Set label
	---------------------------------------- */

game.prototype.set_label = function(label, obj) {
  // position
  if (label.type === "position") {
    this.set_label_text(label, obj.x + " | " + obj.y);
  }

  // player name
  else if (label.type === "player_name") {
    var player = this.players[obj.player_id];
    if (player) {
      this.set_label_text(label, player.name);
    } else {
      delete this.labels[label.key][label.type];
      return;
    }
  }

  // health bar
  else if (label.type === "player_health") {
    this.set_label_health(label, obj.player_id);
  }

  // timeout
  else if (label.type === "timeout") {
    this.set_label_text(
      label,
      ceil((obj.c.timeout - (this.core.state.frame - obj.frame)) / 24)
    );
  }
};

/* Set text label
	---------------------------------------- */

game.prototype.set_label_text = function(label, text) {
  // prep text
  text = String(text);
  text = str_space(text);

  // if there's no change to text
  if (label.text === text) {
    return;
  }

  // draw text
  label.w = label.cont.measureText(text).width + 9;
  label.h = 18;
  label.canv.width = label.w;
  label.canv.height = label.h;
  label.cont.restore();
  label.cont.clearRect(0, 0, label.canv.width, label.canv.height);
  label.cont.font = "12px 'Orbitron'";
  label.cont.fillStyle = "#000";
  label.cont.filter = "drop-shadow(0 2px 4px #000)";
  label.cont.fillText(text, 4, 14 + 0.5);
  label.cont.fillStyle = "#ddd";
  label.cont.fillText(text, 4, 12 + 0.5);
  label.cont.save();
};

/* Set health label
	---------------------------------------- */

game.prototype.set_label_health = function(label, player_id) {
  if (!this.scheme.health) {
    return;
  }

  var player = this.core.state.players[player_id];
  if (!player) {
    delete this.labels[label.key][label.type];
    return;
  }

  // are we doing anything at all
  var level = this.scheme.levels.health[player.level];
  if (!level) {
    return;
  }

  // is it the same
  var text = player.health + " / " + level;
  if (text === label.text) {
    return;
  }
  label.text = text;

  // draw label
  label.w = round(level / 2) + 6;
  label.h = 8;
  label.canv.width = label.w;
  label.canv.height = label.h;
  label.cont.fillStyle = "rgba(255,255,255,0.1)";
  label.cont.fillRect(0, 0, label.w, label.h);
  label.cont.fillStyle = "rgba(0,0,0,0.8)";
  label.cont.fillRect(1, 1, label.w - 2, label.h - 2);
  label.cont.fillStyle = "#e41a1a";
  label.cont.fillRect(3, 3, round(player.health / 2), 2);

  // are we hiding it
  label.hide = player.dead;
};

/* Draw labels
	---------------------------------------- */

game.prototype.draw_labels = function() {
  // go through all labels
  for (key in this.labels) {
    // ignore empties or hiddens
    if (!this.labels[key]) {
      continue;
    }

    // get screen position of object
    var obj = this.core.state.objects[key];
    var position = this.screen_position(obj.dx, obj.dy, 50);

    // ignore too far away objects
    if (!position.on_screen) {
      continue;
    }

    // go through labels
    var n = 0;
    for (type in this.labels[key]) {
      var label = this.labels[key][type];
      if (label.hide) {
        continue;
      }
      var x = round(position.x - label.w / 2) + 0;
      var y =
        round(position.y - label.h / 2 - obj.c.size * 2 - (label.h - 5) * n) -
        20;
      this.canvas.cont.drawImage(label.canv, x, y);
      n++;
    }
  }
};
