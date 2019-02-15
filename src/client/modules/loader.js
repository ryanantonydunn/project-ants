/* ========================================================================
	Asset Loader
 ========================================================================== */

function loader(assets_url, assets, onload) {
  var self = this;

  // set up loading values
  this.onload = onload;
  this.output = {};
  this.loaded = 0;
  this.count = 0;
  for (var type in assets) {
    this.count += Object.keys(assets[type]).length;
    this.output[type] = {};
  }

  // set up audio
  if (assets.audio) {
    if (Object.keys(assets.audio).length > 0) {
      this.audio_context = new AudioContext();
    }
  }

  // do the loading
  for (var type in assets) {
    for (var key in assets[type]) {
      var url = assets_url + assets[type][key];
      if (type == "json") {
        this.json(url, type, key);
      }
      if (type == "img") {
        this.image(url, type, key);
      }
      if (type == "audio") {
        this.audio(url, type, key);
      }
    }
  }
}

/* Load JSON
	---------------------------------------- */

loader.prototype.json = function(url, type, key) {
  var self = this;

  var request = new XMLHttpRequest();
  request.overrideMimeType("application/json");
  request.open("GET", url, true);
  request.onreadystatechange = function() {
    if (request.readyState == 4 && request.status == "200") {
      var response = JSON.parse(request.responseText);
      self.output[type][key] = response;
      self.check_loaded();
    }
  };
  request.send(null);
};

/* Load Image
	---------------------------------------- */

loader.prototype.image = function(url, type, key) {
  var self = this;

  this.output[type][key] = new Image();
  this.output[type][key].src = url;

  // when image is loaded
  this.output[type][key].onload = function() {
    self.check_loaded();
  };
};

/* Load Audio
	---------------------------------------- */

loader.prototype.audio = function(url, type, key) {
  var self = this;

  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  request.onload = function() {
    self.audio_context.decodeAudioData(request.response, function(buffer) {
      if (buffer) {
        var file = self.audio_context.createBufferSource();
        file.buffer = buffer;
        file.connect(self.audio_context.destination);

        var gain = self.audio_context.createGain();
        file.connect(gain);
        gain.connect(self.audio_context.destination);

        file.loop = true;

        // gain.gain.value = 1;
        // file.start(0);

        // this.files[key] = this.cont.createBufferSource();
        // this.files[key].buffer = files[key];
        // this.files[key].connect(this.cont.destination);

        // // set up gain node
        // this.gain[key] = this.cont.createGain();
        // this.files[key].connect(this.gain[key]);
        // this.gain[key].connect(this.cont.destination);

        self.output.audio[key] = buffer;
        self.check_loaded();
      }
    });
  };
  request.send(null);
};

/* Check Assets Are Loaded
	---------------------------------------- */

loader.prototype.check_loaded = function() {
  this.loaded++;

  // if we are not ready yet
  if (this.count <= this.loaded) {
    this.onload(this.output);
  }
};
