var config = config || {};
config.weapons = {
  default: {
    title: "",
    armoury_sprite: "",
    sprite: "",
    fire_audio: "",
    fire_sprite: "",
    fire_body_sprite: "",
    fire_angle_lock: false,
    auto_follow: false,
    require_walk: false,
    speed: 0,
    object: "",
    cooldown: 0,
    recoil: 0,
    inertia: 0
  },
  dig: {
    title: "Dig",
    armoury_sprite: "armoury-dig",
    sprite: "dig",
    fire_sprite: "dig-fire",
    fire_body_sprite: "walk",
    fire_angle_lock: true,
    speed: 3,
    object: "dig",
    cooldown: 10
  },
  phaser: {
    title: "Phaser",
    armoury_sprite: "armoury-laser-blue",
    sprite: "laser",
    fire_audio: "shoot_laser",
    speed: 30,
    object: "laser",
    cooldown: 6,
    recoil: 0.1,
    inertia: 0.5
  },
  bazookoid: {
    title: "Bazookoid",
    armoury_sprite: "bazooka-shell",
    sprite: "bazooka",
    fire_audio: "shoot",
    speed: 24,
    object: "bazooka",
    cooldown: 15,
    recoil: 0.2,
    inertia: 0.5
  },
  grenade: {
    title: "Grenade",
    armoury_sprite: "grenade-green",
    sprite: "throw",
    fire_audio: "throw",
    fire_sprite: "throw-fire",
    speed: 24,
    object: "grenade",
    cooldown: 15,
    recoil: 0,
    inertia: 0.5
  },
  punch: {
    title: "Fire Punch",
    armoury_sprite: "armoury-punch",
    sprite: "punch",
    fire_audio: "throw",
    fire_body_sprite: "superman",
    speed: 16,
    object: "punch",
    cooldown: 60,
    recoil: 0,
    inertia: 0.5
  },
  pumpkin: {
    title: "Pumpkin",
    armoury_sprite: "pumpkin",
    sprite: "throw",
    fire_audio: "throw",
    fire_sprite: "throw-fire",
    speed: 15,
    object: "pumpkin",
    cooldown: 48,
    recoil: 0,
    inertia: 0.5
  },
  paingiver: {
    title: "Paingiver 2000",
    armoury_sprite: "rocket",
    sprite: "bazooka",
    fire_audio: "shoot",
    speed: 24,
    object: "paingiver",
    cooldown: 10,
    recoil: 0.4,
    inertia: 0.5
  }
};

// prep weapons
for (key in config.weapons) {
  config.weapons[key] = deepmerge(config.weapons.default, config.weapons[key], {
    arrayMerge: dont_merge
  });
}
