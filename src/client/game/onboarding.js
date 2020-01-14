/* ========================================================================
    Game
    Run Onboarding
 ========================================================================== */

var isMobile = typeof window.orientation !== "undefined";

var onboardingMessages = isMobile
  ? {
      move: "Tap and hold to move",
      jump: "Double tap to jump",
      shoot: "Tap and hold to aim then tap with another finger to fire",
      selectWeapon: "Try a different weapon by selecting in the armoury"
    }
  : {
      move: "Click and hold to move",
      jump: "Double click to jump",
      shoot: "Ctrl/Cmd click to fire",
      selectWeapon: "Try a different weapon by selecting in the armoury"
    };

game.prototype.init_onboarding = function() {
  this.onboarding = "move";
  this.div_onboarding = element({
    class: "onboarding",
    text: onboardingMessages.move
  });
  append(this.div, this.div_onboarding);
};

game.prototype.set_onboarding = function(type) {
  if (type === "move") {
    this.onboarding = "jump";
    this.div_onboarding.innerHTML = onboardingMessages.jump;
  } else if (type === "jump") {
    this.onboarding = "shoot";
    this.div_onboarding.innerHTML = onboardingMessages.shoot;
  } else if (type === "shoot") {
    this.onboarding = "selectWeapon";
    this.div_onboarding.innerHTML = onboardingMessages.selectWeapon;
    add_class(this.div, "onboard_select_weapon");
  } else if (type === "selectWeapon") {
    this.onboarding = "";
    hide(this.div_onboarding);
    remove_class(this.div, "onboard_select_weapon");
  }
};
