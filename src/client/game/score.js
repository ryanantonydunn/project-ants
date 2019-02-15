/* ========================================================================
    Game
    Scores
 ========================================================================== */

/* Build score interface
    ---------------------------------------- */

game.prototype.init_score = function() {
  if (!this.scheme.score) {
    return;
  }

  this.div_score = element({ class: "score" });
  append(this.div, this.div_score);

  this.div_score_gem = element({ class: "gem" });
  this.div_score_text = element({ class: "text" });
  append(this.div_score, this.div_score_gem);
  append(this.div_score, this.div_score_text);

  // are we doing levels
  if (this.scheme.levels) {
    this.div_score_bar = element({ class: "bar" });
    this.div_score_bar_in = element({ class: "bar-inner" });
    this.div_score_level = element({ class: "level hex-button", text: " LVL" });
    this.div_score_level_num = element({ class: "level-num", text: "1" });
    append(this.div_score, this.div_score_bar);
    append(this.div_score_bar, this.div_score_bar_in);
    append(this.div_score, this.div_score_level);
    append(this.div_score_level, this.div_score_level_num);
  }
};

/* Set score interface
    ---------------------------------------- */

game.prototype.set_score = function() {
  if (!this.scheme.score) {
    return;
  }
  if (!this.player) {
    hide(this.div_score);
    return;
  } else {
    show(this.div_score);
  }

  this.div_score_text.innerHTML = this.player.score;
  if (this.scheme.levels) {
    this.div_score_level_num.innerHTML = this.player.level + 1;

    // do exp bar
    var width = 0;
    var this_level = this.scheme.levels.score[this.player.level];
    var next_level = this.scheme.levels.score[this.player.level + 1];
    if (this_level && next_level) {
      width = (
        ((this.player.score - this_level) / (next_level - this_level)) *
        94
      ).fixed();
    }
    this.div_score_bar_in.style.width = width + "%";
  }
};
