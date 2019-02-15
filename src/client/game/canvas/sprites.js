/* ========================================================================
    Game
    Sprites
 ========================================================================== */

/* Run sprites
	---------------------------------------- */

game.prototype.draw_sprites = function() {
  this.sprites = [];

  // objects
  for (var key in this.core.state.objects) {
    var obj = this.core.state.objects[key];
    if (obj.hide > 0) {
      obj.hide--;
      continue;
    }
    if (obj.type === "player") {
      var player = this.core.state.players[obj.player_id];
      if (player) {
        if (player.hit > 0) {
          this.draw_player_hit_sprites(obj, player.hit);
        } else {
          this.draw_player_sprites(obj, player);
        }
      }
      continue;
    }
    var args = {
      frame: obj.frame,
      type: obj.sprite_key,
      x: obj.dx,
      y: obj.dy,
      angle: obj.display_angle,
      animate: obj.animate,
      float: obj.c.animation.air_float,
      repeat: true
    };
    this.sprites.unshift(args);
  }

  // explosions
  for (var key in this.explosions) {
    var obj = this.explosions[key];
    var args = {
      frame: obj.frame,
      type: obj.sprite,
      x: obj.x,
      y: obj.y,
      animate: true
    };
    this.sprites.push(args);
  }

  // decorations
  for (var key in this.decorations) {
    var obj = this.decorations[key];
    var args = {
      frame: obj.frame,
      type: obj.sprite,
      x: obj.x,
      y: obj.y,
      angle: obj.angle,
      animate: true,
      repeat: obj.repeat
    };
    this.sprites.unshift(args);
  }

  // get arrows
  this.run_arrows();

  // draw them
  this.draw_sprites_canv();
};

/* Player sprites
	---------------------------------------- */

game.prototype.draw_player_sprites = function(obj, player) {
  var w =
    this.player_id === obj.player_id ? this.current_weapon : player.weapon;
  var weapon = this.c.weapons[w];

  // body
  this.sprites.push({
    frame: obj.frame,
    type: obj.sprite_key,
    x: obj.dx,
    y: obj.dy,
    angle: obj.display_angle,
    animate: obj.animate,
    repeat: true
  });

  // get head direction and angle
  var head_dir = obj.direction;
  if (obj.grounded) {
    var diff = n_diff(
      obj.barrel_angle,
      angle_add(obj.display_angle, 90),
      0,
      360
    );
    head_dir = diff >= -180 && diff < 0 ? "right" : "left";
  }
  var head_angle =
    head_dir === "right" ? angle_add(obj.barrel_angle, 180) : obj.barrel_angle;

  // weapons
  var weapon_sprite = "";
  if (weapon && weapon.sprite) {
    var weapon_sprite = weapon.sprite;
    var weapon_frame = 0;
    var throwing = weapon.sprite === "throw";

    // just fired sprites
    if (obj.fire_sprite_count) {
      weapon_sprite = weapon.fire_sprite;
      weapon_frame = obj.fire_sprite_frame;
      throwing = false;
    }

    // add the weapon sprite
    this.sprites.push({
      type: "ant-weapon-" + weapon_sprite + "-" + head_dir,
      x: this.core.map.loop_x(obj.dx),
      y: this.core.map.loop_y(obj.dy),
      frame: weapon_frame,
      animate: true,
      repeat: true,
      angle: head_angle
    });
  }

  // head
  this.sprites.push({
    type: "ant-head-" + head_dir,
    x: this.core.map.loop_x(obj.dx),
    y: this.core.map.loop_y(obj.dy),
    animate: true,
    repeat: true,
    angle: head_angle
  });

  // add a throw weapon
  if (throwing) {
    var tobj = this.c.objects[weapon.object];
    var tsprite = tobj.animation.sprite;
    var toff_x = xy_speed(obj.barrel_angle, -16);
    var toff_y = xy_speed(angle_add(head_angle, 90), 14);
    this.sprites.push({
      type: tsprite,
      x: this.core.map.loop_x(obj.dx + toff_x.x + toff_y.x),
      y: this.core.map.loop_y(obj.dy + toff_x.y + toff_y.y),
      animate: false,
      angle: angle_add(obj.barrel_angle, 90)
    });
  }

  // // set crosshair
  // if (this.player_id === obj.player_id) {
  // 	var offx = xy_speed(angle, 50 + weapon.offset_x);
  // 	var offy = xy_speed(offset_angle, 7);
  // 	this.sprites.push({
  // 		type: "crosshair",
  // 		x: round(obj.dx + offx.x + offy.x),
  // 		y: round(obj.dy + offx.y + offy.y),
  // 		angle: angle_add(this.crosshair, 180)
  // 	});
  // }
};

/* Player hit sprites
	---------------------------------------- */

game.prototype.draw_player_hit_sprites = function(obj, hit) {
  // body
  this.sprites.push({
    frame: obj.frame,
    type: hit < 15 ? "ant-body-air-left" : "ant-body-hit",
    x: obj.dx,
    y: obj.dy,
    angle: obj.display_angle,
    animate: obj.animate,
    repeat: true
  });

  // head
  this.sprites.push({
    type: hit < 15 ? "ant-head-left" : "ant-head-hit",
    x: this.core.map.loop_x(obj.dx),
    y: this.core.map.loop_y(obj.dy),
    animate: true,
    repeat: true,
    angle: obj.display_angle
  });
};

/* Draw sprites on the canvas
	---------------------------------------- */

game.prototype.draw_sprites_canv = function() {
  for (var i = 0; i < this.sprites.length; i++) {
    var sprite = this.sprites[i];

    // get position on screen
    var screen_position = this.screen_position(sprite.x, sprite.y, 48);
    if (!screen_position.on_screen) {
      continue;
    }

    // get sprite key
    var sprite_key = sprite.type;
    var animation = this.c.animations[sprite_key];
    if (animation) {
      sprite_key = animation[0];
      if (sprite.animate) {
        var frame = sprite.frame || 0;
        frame = floor((this.core.state.frame - frame) / 2);
        if (sprite.repeat) {
          frame = frame % animation.length;
        }
        sprite_key = animation[frame];
      }
    }

    // get sprite reference positions
    var sprite_ref = this.c.sprites[sprite_key];
    if (!sprite_ref) {
      continue;
    }

    // get new position to draw on
    var size = sprite_ref.size;
    var pos = -(size / 2);

    // float effect
    var y_add = 0;
    if (sprite.float) {
      y_add = cos((this.core.state.frame - sprite.frame) / 4) * 2;
    }

    // draw it
    this.canvas.cont.save();
    this.canvas.cont.translate(screen_position.x, screen_position.y + y_add);
    if (sprite.angle !== 0) {
      this.canvas.cont.rotate((sprite.angle * Math.PI) / 180);
    }
    this.canvas.cont.drawImage(
      this.img.sprites,
      sprite_ref.x,
      sprite_ref.y,
      size,
      size,
      pos,
      pos,
      size,
      size
    );
    this.canvas.cont.translate(
      -screen_position.x,
      -(screen_position.y + y_add)
    );
    this.canvas.cont.restore();
  }
};
