/* ========================================================================
    Game
    Armoury
 ========================================================================== */

/* Build armoury interface
    ---------------------------------------- */

game.prototype.init_armoury = function() {
  // selected weapon
  this.current_weapon = "";

  // detonation cooldown
  this.detonation_cooldown = 0;

  // create divs
  this.armoury = {
    div: element({ class: "armoury box" }),
    title: element({ class: "title" }),
    player: element({ class: "player_weapon hex-button" }),
    weapons: {},
    show_icon: false,
    show_icon_frame: null
  };
  append(this.div, this.armoury.div);
  append(this.div, this.armoury.player);
  hide(this.armoury.player);

  // go through armoury layout
  var self = this;
  for (var i = 0; i < this.scheme.armoury.length; i++) {
    var type = this.scheme.armoury[i];

    // create elements
    this.armoury.weapons[type] = {
      box: element({ class: "hex-button weapon", data: type }),
      sprite: element({ class: "sprite" }),
      count: element({ class: "count" }),
      player_icon: element({ class: "icon sprite" }),
      i: i,
      active: false
    };
    append(this.armoury.div, this.armoury.weapons[type].box);
    append(this.armoury.weapons[type].box, this.armoury.weapons[type].sprite);
    append(this.armoury.weapons[type].box, this.armoury.weapons[type].count);
    append(this.armoury.player, this.armoury.weapons[type].player_icon);
    hide(this.armoury.weapons[type].player_icon);

    // set sprite background position
    var weapon = this.c.weapons[type];
    var sprite = this.c.sprites[weapon.armoury_sprite];
    if (!sprite) {
      continue;
    }
    var offset = ceil((sprite.size - 48) / 2);
    var x = -sprite.x - offset;
    var y = -sprite.y - offset;
    var pos = x - 1 + "px " + y + "px, 0 0";
    this.armoury.weapons[type].sprite.style.backgroundPosition = pos;
    this.armoury.weapons[type].player_icon.style.backgroundPosition = pos;

    // set element events
    this.armoury.weapons[type].box.onclick = function() {
      self.weapon_select(this.dataset.data);
    };
  }

  append(this.armoury.div, this.armoury.title);
  hide(this.armoury.div);
};

/* Initialise armoury with core data
	---------------------------------------- */

game.prototype.set_armoury = function() {
  // set display for all weapons
  for (type in this.armoury.weapons) {
    this.set_weapon(type);
  }

  // select weapon
  if (
    !this.current_weapon ||
    !this.armoury.weapons[this.current_weapon].active
  ) {
    this.weapon_select_n(0);
  }
};

/* Select weapon
	---------------------------------------- */

game.prototype.weapon_select = function(type, no_highlight) {
  // if same weapon or none left
  if (
    !this.player ||
    this.current_weapon === type ||
    this.player.armoury[type] === 0
  ) {
    return;
  }

  // do the change
  for (var key in this.armoury.weapons) {
    remove_class(this.armoury.weapons[key].box, "selected");
    hide(this.armoury.weapons[key].player_icon);
  }
  add_class(this.armoury.weapons[type].box, "selected");
  this.current_weapon = type;
  this.armoury.title.innerHTML = this.c.weapons[type].title;

  // auto following weapon
  var wep = this.c.weapons[type];
  if (
    (wep.auto_follow && !this.weapon_follow) ||
    (!wep.auto_follow && this.weapon_follow)
  ) {
    this.toggle_weapon_follow();
  }

  if (!no_highlight) {
    // play noise
    this.audio.play("bleep1", 0.8);

    // show icon
    this.armoury.show_icon = true;
    this.armoury.show_icon_frame = this.core.state.frame;
    show(this.armoury.weapons[type].player_icon);
    show(this.armoury.player);
  }

  return type;
};

/* Select weapon by position in armoury
	---------------------------------------- */

game.prototype.weapon_select_n = function(n) {
  // if is too big
  if (n >= this.scheme.armoury.length) {
    return;
  }

  // go through columns
  var n2 = 0;
  for (var i = 0; i < this.scheme.armoury.length; i++) {
    var weapon = this.scheme.armoury[i];
    var active = false;
    if (this.armoury.weapons[weapon].active) {
      active = true;
      if (n2 === n && weapon !== this.current_weapon) {
        return this.weapon_select(weapon);
      }
    }

    // increase count of actual columns
    n2 = active ? n2 + 1 : n2;
  }

  return false;
};

/* Select weapon by scrolling
	---------------------------------------- */

game.prototype.weapon_scroll = function(down) {
  // if we don't have a selected weapon
  var current = this.armoury.weapons[this.current_weapon];
  if (!current) {
    return;
  }

  for (var i = 1; i < this.scheme.armoury.length; i++) {
    var i_down = down ? this.scheme.armoury.length - i : i;
    var new_i = n_loop(current.i + i_down, -1, this.scheme.armoury.length - 1);
    var weapon = this.scheme.armoury[new_i];
    if (this.armoury.weapons[weapon].active) {
      this.weapon_select(weapon);
      return weapon;
    }
  }
};

/* Change to weapon
	---------------------------------------- */

game.prototype.set_weapon = function(type) {
  if (!this.player) {
    return;
  }

  var count = this.player.armoury[type];
  this.armoury.weapons[type].count.innerHTML = count;

  if (count == -1) {
    this.armoury.weapons[type].active = true;
    show(this.armoury.weapons[type].box);
    hide(this.armoury.weapons[type].count);
  } else {
    if (count < 1) {
      this.armoury.weapons[type].active = false;
      hide(this.armoury.weapons[type].box);
      if (type == this.current_weapon) {
        this.weapon_select_n(0);
      }
    } else {
      this.armoury.weapons[type].active = true;
      show(this.armoury.weapons[type].box);
    }
  }

  if (!this.current_weapon) {
    this.weapon_select_n(0);
  }
  this.display_armoury();
};

/* Show armoury or not
	---------------------------------------- */

game.prototype.display_armoury = function() {
  var show_it = false;
  var even = false;
  if (this.player) {
    for (key in this.player.armoury) {
      if (this.player.armoury[key] > 0 || this.player.armoury[key] == -1) {
        show_it = true;
        even = !even;
      }
      this.armoury.weapons[key].box.style.marginTop = even ? "26px" : "0px";
    }
  }
  if (show_it) {
    show(this.armoury.div);
  } else {
    hide(this.armoury.div);
  }
};

/* Run every frame
	---------------------------------------- */

game.prototype.run_armoury = function() {
  // turn off icon
  if (
    this.armoury.show_icon &&
    this.core.state.frame > this.armoury.show_icon_frame + 30
  ) {
    this.armoury.show_icon = false;
    hide(this.armoury.player);
  }
};
