/* ========================================================================
    Onboarding
 ========================================================================== */

function onboarding() {
  this.count = 0;
  this.done = false;
  this.action = {
    move: false,
    jump: false,
    shoot: false
  };

  if (typeof Storage !== "undefined") {
    this.count = localStorage.getItem("pants_onboarding") || 0;
    this.done = this.count > 1;
  }
}

/* Trigger onboardingness
	---------------------------------------- */

onboarding.prototype.set = function(type) {
  if (this.done) {
    return;
  }
  this.action[type] = true;
  for (let key in this.action) {
    if (!this.action[key]) {
      return;
    }
  }
  this.done = true;
  if (typeof Storage !== "undefined") {
    localStorage.setItem("pants_onboarding", this.count + 1);
  }
};
