/* ========================================================================
	Audio
 ========================================================================== */

window.AudioContext = window.AudioContext || window.webkitAudioContext;

function audio(assets_url) {
  var self = this;

  this.cont = new AudioContext();
  this.buffers = {};
  this.repeaters = {};
  this.volume = 0.1;
  this.stored_volume = 0.1;

  // button hover swish events
  this.button_hover = null;
  document.onmousemove = function(e) {
    if (self.volume == 0) {
      return;
    }
    if (
      e.target.classList.contains("button") ||
      e.target.tagName.toLowerCase() == "button"
    ) {
      if (
        e.target != self.button_hover &&
        !e.target.classList.contains("disabled")
      ) {
        self.button_hover = e.target;
        self.play("bloop1", 1);
      }
    } else {
      self.button_hover = null;
    }
  };
}

/* Set volume
	---------------------------------------- */

audio.prototype.set_global_volume = function(vol) {
  this.volume = vol;
};

/* Add buffers
	---------------------------------------- */

audio.prototype.add_buffers = function(buffers) {
  this.buffers = Object.assign(this.buffers, buffers);
};

/* Play a file
	---------------------------------------- */

audio.prototype.play = function(key, volume, repeat) {
  // if no sound effect
  if (!this.buffers[key]) {
    return;
  }

  // if we're not active
  if (!document.hasFocus() && key !== "join") {
    return;
  }

  var obj = {};
  obj.audio_key = key;
  obj.gain = this.cont.createGain();
  obj.source = this.cont.createBufferSource();
  obj.source.buffer = this.buffers[key];
  obj.source.connect(obj.gain);
  obj.gain.connect(this.cont.destination);
  obj.source.loop = repeat;
  obj.source.start(0);

  this.set_volume(obj, volume);

  return obj;
};

/* Set volume
	---------------------------------------- */

audio.prototype.set_volume = function(obj, volume) {
  if (!obj) {
    return;
  }
  volume = !volume ? 0 : min(volume, 1);
  obj.gain.gain.value = (volume * this.volume).fixed();
};

/* Stop playing audio
	---------------------------------------- */

audio.prototype.stop = function(obj) {
  this.cont.close();
  this.cont = new AudioContext();
};
