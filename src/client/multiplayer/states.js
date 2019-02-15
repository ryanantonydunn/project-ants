/* ========================================================================
    Game States
 ========================================================================== */

/* Receive game state from server
    ---------------------------------------- */

multiplayer.prototype.game_state_received = function(event) {
  // if we are loading
  if (this.loading_start) {
    return;
  }

  // start the game
  if (!this.initialised || this.disconnected) {
    this.initialised = true;
    this.init_game(event);
    return;
  }

  var diff = event.frames - this.frames;

  // if we are too quick
  if (diff < 0) {
    // console.log("client too fast");
    this.init_game(event);
    return;
  }

  // if it's too far behind resync
  if (diff > 9) {
    // console.log("resync");
    this.init_game(event);
    return;
  }

  // apply the state
  if (event.frames === this.frames) {
    this.set_game_state(event);
  } else {
    this.store_packet[event.frames] = duplicate_obj(event);
  }
};

/* Set game state
    ---------------------------------------- */

multiplayer.prototype.set_game_state = function(event, ignore_res) {
  // run damages
  this.resolve_ground(event.damages);

  // unpack the state
  var state = this.game.core.unpack_state(event.state);

  // set players
  this.resolve_players(state, ignore_res);

  // set this player
  if (!ignore_res) {
    this.resolve_this_player(state, event.responses);
  }

  // set objects
  this.resolve_objects(state.objects, event.frames);

  // set explosions
  this.resolve_explosions(state.explosions, event.frames);

  // set game player references
  this.game.set_this_player_refs();
};

/* Resolve players
    ---------------------------------------- */

multiplayer.prototype.resolve_players = function(state, ignore_res) {
  // set all other players
  for (var key in state.players) {
    if (parseInt(key) !== this.player_id || ignore_res) {
      this.game.init_player(state.players[key], true);
    }
  }

  // remove players
  for (var key in this.game.core.state.players) {
    if (!state.players[key]) {
      this.game.core.remove_player(key);
    }
  }
};

/* Resolve this player
    ---------------------------------------- */

multiplayer.prototype.resolve_this_player = function(state, responses) {
  // prep server state objects
  var server_player = state.players[this.player_id];
  var server_obj = state.objects["player-" + this.player_id];
  if (!server_player || !server_obj) {
    return;
  }

  // prep server responses
  var server_responses = [];
  var split = responses.split("$");
  for (var i = 0; i < split.length; i++) {
    var split2 = split[i].split("~");
    server_responses.push({
      frame: parseInt(split2[0]),
      success: split2[1] === "1",
      x: parseFloat(split2[2]),
      y: parseFloat(split2[3]),
      speed_x: parseFloat(split2[4]),
      speed_y: parseFloat(split2[5]),
      type: split2[6]
    });
  }

  // check player weapon
  if (server_player.weapon !== this.game.current_weapon) {
    this.sockets.message_send("weapon_selected", [this.game.current_weapon]);
  }

  // if we have no more actions
  if (this.store_responses.length === 0) {
    this.game.player.level = server_player.level;
    this.game.player.score = server_player.score;
    this.game.player.dead = server_player.dead;
    this.game.player.health = server_player.health;
    this.game.player.cooldown = server_player.cooldown;
    this.game.player.armoury = duplicate_obj(server_player.armoury);
    this.game.set_armoury();
  }

  // resolve our player
  for (var i = 0; i < this.store_responses.length; i++) {
    var client_response = this.store_responses[i];

    // go through action responses
    for (var j = 0; j < server_responses.length; j++) {
      var server_response = server_responses[j];

      // correct frame
      if (client_response.frame === server_response.frame) {
        // compare the response
        if (
          client_response.success === server_response.success &&
          client_response.x === server_response.x &&
          client_response.y === server_response.y &&
          client_response.speed_x === server_response.speed_x &&
          client_response.speed_y === server_response.speed_y
        ) {
          // clog("act success", server_response.frame, this.frames, server_response.type, client_response.x, server_response.x, client_response.y, server_response.y);
        } else {
          // resync the player
          clog(
            "act fail",
            server_response.frame,
            this.frames,
            server_response.type,
            client_response.x,
            server_response.x,
            client_response.y,
            server_response.y
          );
          if (!this.resync_this_player(server_response)) {
            this.game.init_player(server_player, false, true);
            this.game.create_object(server_obj);
            return;
          }
        }
        server_responses.splice(j, 1);
        this.store_responses.splice(i, 1);
        i--;
        break;
      }
    }
  }
};

/* Sync this player
    ---------------------------------------- */

multiplayer.prototype.resync_this_player = function(server_response) {
  // how far back is this
  var frame = server_response.frame;
  var frame_difference = this.frames - frame;

  // if it's too far back
  // if we have no state to roll back to
  if (frame_difference > 20 || !this.store_state[frame]) {
    // console.log("sync too far back | " + frame_difference);
    return false;
  }

  // reset game state
  this.set_game_state(this.store_state[frame], true);

  // reset player
  this.store_responses = [];
  this.game.player_obj.x = server_response.x;
  this.game.player_obj.y = server_response.y;
  this.game.player_obj.speed_x = server_response.speed_x;
  this.game.player_obj.speed_y = server_response.speed_y;

  // run all frames up to this point
  for (var i = 1; i <= frame_difference; i++) {
    this.frame_run(frame + i);
  }

  return true;
};

/* Resolve objects
    ---------------------------------------- */

multiplayer.prototype.resolve_objects = function(objects, frame) {
  // check for uncreated objects
  for (var key in objects) {
    if (!this.game.core.state.objects[key]) {
      if (!this.wait_to_create[key] || this.wait_to_create[key] + 40 < frame) {
        delete this.wait_to_create[key];
        this.game.create_object(objects[key]);
      }
    }
  }

  // if there's no corresponding server object
  for (var key in this.game.core.state.objects) {
    if (!objects[key]) {
      // give them a delay
      if (!this.wait_to_destroy[key]) {
        this.wait_to_destroy[key] = frame + 40;
        continue;

        // remove when delay has expired
      } else if (this.wait_to_destroy[key] < frame) {
        delete this.game.core.state.objects[key];
        delete this.wait_to_destroy[key];
      }
    }
  }

  // match up objects
  for (var key in this.game.core.state.objects) {
    // if our player and waiting for action responses
    if (key === "player-" + this.player_id) {
      if (this.store_responses.length !== 0) {
        continue;
      }
    }

    var obj = this.game.core.state.objects[key];
    var res_obj = objects[key];

    // ignore any objects with no reference
    if (!res_obj) {
      continue;
    }

    // match values
    if (obj.type !== res_obj.type) {
      obj.type = res_obj.type;
      obj.c = this.game.c.objects[obj.type];
    }
    obj.grounded = res_obj.grounded;

    // if grounded or us
    if (obj.grounded || obj.player_id === this.player_id) {
      obj.x = res_obj.x;
      obj.y = res_obj.y;
      obj.speed_x = res_obj.speed_x;
      obj.speed_y = res_obj.speed_y;

      // set interpolation position
    } else if (!obj.actioned) {
      obj.ghost = frame;
      obj.gx = obj.x;
      obj.gy = obj.y;
      obj.x = res_obj.x;
      obj.y = res_obj.y;
      obj.speed_x = res_obj.speed_x;
      obj.speed_y = res_obj.speed_y;
    }
  }
};

/* Resolve objects
    ---------------------------------------- */

multiplayer.prototype.resolve_explosions = function(explosions, frame) {
  // check for uncreated explosions
  for (var key in explosions) {
    if (!this.game.core.state.explosions[key]) {
      this.game.core.create_explosion(explosions[key]);

      // ensure correct position
    } else {
      this.game.core.state.explosions[key].x = explosions[key].x;
      this.game.core.state.explosions[key].y = explosions[key].y;
    }
  }
};
