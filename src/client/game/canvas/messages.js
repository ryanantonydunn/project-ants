/* ========================================================================
    Game
    Object Messages
 ========================================================================== */

/* Draw the messages
	---------------------------------------- */

game.prototype.draw_messages = function() {
  // go through messages
  for (var i = 0; i < this.messages.length; i++) {
    var message = this.messages[i];

    // increment time
    message.time++;
    if (message.time > 40) {
      this.messages.splice(i, 1);
      continue;
    }

    // get screen position of message
    var position = this.screen_position(message.x, message.y, 50);

    // ignore too far away messages
    if (!position.on_screen) {
      continue;
    }

    // go through labels
    var x = round(position.x - message.w / 2) + 0.5;
    var y = round(position.y - message.h / 2) - 30.5 - message.time;

    this.canvas.cont.save();
    this.canvas.cont.translate(0, 0);
    this.canvas.cont.drawImage(message.canv, x, y);
    this.canvas.cont.restore();
  }
};

/* Look for changes in health
	---------------------------------------- */

game.prototype.create_message = function(obj, col, text, size, y_offset) {
  // set up canvas
  var message = {};
  message.canv = element({ type: "canvas" });
  message.cont = message.canv.getContext("2d");

  // draw text
  text = str_space(text);
  message.cont.font = size + "px Orbitron";
  message.w = round(message.cont.measureText(text).width) + 8;
  message.h = size + 4;
  message.canv.width = message.w;
  message.canv.height = message.h;
  message.cont.font = size + "px Orbitron";
  // message.cont.fillStyle = "#000";
  // message.cont.fillText(text, 3.5, size + 0.5);
  message.cont.fillStyle = col;
  message.cont.fillText(text, 3.5, size + 0.5);

  // set position
  var y_offset = y_offset || 0;
  message.x = obj.x;
  message.y = obj.y + y_offset;
  message.time = 0;

  // add to array
  this.messages.push(message);
};
