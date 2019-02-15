var config = config || {};
config.objects = {
  default: {
    size: 1,
    weight: 0,
    bounce: 0.4,
    timeout: 0,
    damage: 30,
    knock: 1,
    spawn: false,
    player_lock: false,
    launch_distance: 2,
    destroy_ground: true,
    stop: 0,
    ignore_level_damage: false,
    events: {
      frame: "",
      ground: "",
      object: "",
      explosion: "",
      die: ""
    },
    object_events: {},
    speed: {
      max_gravity: 30,
      max: 40,
      move: 4,
      jump: 10
    },
    cluster: {
      circle: true,
      object: "grenade",
      speed: 2,
      count: 6
    },
    animation: {
      explosion: "explosion-l",
      sprite: "",
      air_spin: false,
      air_float: false,
      static_angle: false,
      ground: false
    },
    audio: {
      explosion: "explosion",
      bounce: "donk",
      hit: "",
      air: "",
      walk: "walk"
    },
    labels: {
      player_health: false,
      player_name: false,
      timeout: false
    },
    trails: {
      count: 0,
      speed: 0.6,
      offset_x: 0,
      offset_y: 0,
      timeout: 0,
      rotate: false,
      move: true,
      sprite: ""
    }
  },
  player: {
    size: 12,
    weight: 0.7,
    bounce: 0.7,
    events: {
      ground: "player_bounce",
      explosion: "hit_receive"
    },
    object_events: {
      crate: "collect",
      medpack: "collect",
      "gem-1": "collect",
      "gem-5": "collect",
      "gem-20": "collect",
      "gem-50": "collect",
      "gem-200": "collect",
      vortex: "collect"
    },
    animation: {
      sprite: "ant-body",
      air_spin: false,
      ground: false
    },
    audio: {
      bounce: "doink",
      explosion: "pop"
    },
    labels: {
      player_health: true,
      player_name: true
    }
  },
  player_missile: {
    size: 12,
    weight: 0.7,
    damage: 50,
    events: {
      ground: ["bounce_explode", "spawn_ghost"],
      explosion: ["bounce_explode", "spawn_ghost"]
    },
    object_events: {
      player: ["bounce_explode", "spawn_ghost"]
    },
    animation: {
      sprite: "ant-bomb",
      air_spin: true
    },
    labels: {
      player_name: true
    },
    trails: {
      count: 2,
      speed: 0.6,
      timeout: 10,
      sprite: "ball-red"
    }
  },
  player_ghost: {
    size: 12,
    weight: 0,
    damage: 1,
    knock: 0,
    events: {
      object: "hit_receive",
      explosion: "hit_receive"
    },
    object_events: {
      player: "hit_give"
    },
    speed: {
      max: 2.5,
      move: 0.3
    },
    animation: {
      sprite: "ant-ghost",
      air_float: true
    },
    labels: {
      player_name: true
    }
  },
  crate: {
    size: 16,
    spawn: true,
    animation: {
      sprite: "crate-weapon",
      air_float: true
    },
    trails: {
      count: 2,
      speed: 1,
      timeout: 30,
      rotate: false,
      move: true,
      sprite: "ball-blue"
    }
  },
  medpack: {
    size: 16,
    spawn: true,
    animation: {
      sprite: "crate-health",
      air_float: true
    },
    trails: {
      count: 2,
      speed: 1,
      timeout: 30,
      rotate: false,
      move: true,
      sprite: "ball-red"
    }
  },
  "gem-1": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-green",
      static_angle: true,
      air_float: true
    }
  },
  "gem-5": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-blue",
      static_angle: true,
      air_float: true
    }
  },
  "gem-20": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-red",
      static_angle: true,
      air_float: true
    }
  },
  "gem-50": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-purple",
      static_angle: true,
      air_float: true
    }
  },
  "gem-200": {
    size: 18,
    spawn: true,
    stop: 10,
    animation: {
      sprite: "gem-silver",
      static_angle: true,
      air_float: true
    }
  },
  vortex: {
    size: 22,
    animation: {
      sprite: "vortex"
    }
  },
  target: {
    size: 22,
    damage: 0,
    spawn: true,
    events: {
      object: "die",
      explosion: "die",
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      explosion: "explosion-laser-blue",
      sprite: "target",
      air_float: true
    },
    audio: {
      explosion: "pop",
      air: "none"
    }
  },
  nuclear: {
    size: 22,
    damage: 100,
    spawn: true,
    events: {
      object: "die",
      explosion: "die",
      die: "explode"
    },
    animation: {
      explosion: "explosion-green-l",
      sprite: "nuclear",
      air_float: true
    },
    audio: {
      explosion: "explosion_gas",
      air: "none"
    }
  },
  mine: {
    size: 58,
    damage: 80,
    events: {
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      sprite: "mine",
      air_float: true
    }
  },
  "asteroid-small": {
    size: 15,
    weight: 1,
    damage: 40,
    events: {
      object: "die",
      ground: "die",
      explosion: "die",
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      explosion: "explosion2-l",
      sprite: "asteroid-small",
      air_spin: true
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 2,
      speed: 0.6,
      offset_x: -5,
      timeout: 10,
      sprite: "flame"
    }
  },
  "asteroid-large": {
    size: 34,
    weight: 1,
    damage: 80,
    events: {
      object: "die",
      ground: "die",
      explosion: "die",
      die: "cluster"
    },
    object_events: {
      player: "die"
    },
    cluster: {
      circle: true,
      object: "asteroid-small",
      speed: 16,
      count: 3
    },
    animation: {
      explosion: "explosion2-l",
      sprite: "asteroid-large",
      air_spin: true
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 2,
      speed: 0.6,
      offset_x: -5,
      timeout: 20,
      sprite: "flame"
    }
  },
  dig: {
    size: 2,
    weight: 0,
    damage: 16,
    timeout: 6,
    ignore_level_damage: true,
    events: {
      ground: ["destroy", "drag_player", "die"]
    }
  },
  punch: {
    size: 20,
    weight: 0,
    damage: 16,
    timeout: 8,
    player_lock: true,
    stop: 6,
    events: {
      ground: "slide"
    },
    object_events: {
      player: "hit_give"
    },
    animation: {
      sprite: "flame-large"
    },
    audio: {
      air: "fly",
      bounce: "doink",
      hit: "punch"
    },
    trails: {
      count: 1,
      speed: 1.5,
      offset_x: -10,
      offset_y: 0,
      timeout: 10,
      rotate: false,
      move: true,
      sprite: "flame"
    }
  },
  laser: {
    size: 24,
    weight: 0,
    timeout: 20,
    damage: 30,
    destroy_ground: false,
    events: {
      ground: "die",
      object: "none",
      die: "none"
    },
    object_events: {
      player: ["explode", "die"],
      player_ghost: ["hit_give", "die"]
    },
    animation: {
      sprite: "laser-blue",
      explosion: "explosion-laser-blue"
    },
    audio: {
      explosion: "explosion_laser"
    },
    trails: {
      count: 1,
      speed: 0,
      timeout: 10,
      rotate: false,
      move: false,
      sprite: "bubble-blue"
    }
  },
  bazooka: {
    size: 6,
    weight: 0.7,
    timeout: 300,
    damage: 70,
    events: {
      ground: "die",
      object: "die",
      explosion: "die",
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      sprite: "bazooka-shell"
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 1,
      speed: 1.5,
      offset_x: -10,
      offset_y: 0,
      timeout: 10,
      rotate: false,
      move: true,
      sprite: "flame"
    }
  },
  grenade: {
    size: 4,
    weight: 0.7,
    timeout: 72,
    damage: 50,
    events: {
      ground: "bounce",
      object: "bounce",
      explosion: "bounce",
      die: "explode"
    },
    object_events: {
      player: "bounce"
    },
    animation: {
      air_spin: true,
      sprite: "grenade-armed"
    },
    labels: {
      timeout: true
    },
    audio: {
      air: "countdown"
    },
    trails: {
      count: 1,
      timeout: 20,
      rotate: false,
      move: true,
      sprite: "ball-green"
    }
  },
  pumpkin: {
    size: 10,
    weight: 1,
    timeout: 120,
    damage: 70,
    events: {
      ground: "bounce",
      object: "bounce",
      explosion: "bounce",
      die: "cluster"
    },
    object_events: {
      player: "bounce"
    },
    animation: {
      air_spin: true,
      sprite: "pumpkin"
    },
    labels: {
      timeout: true
    },
    audio: {
      air: "spooky"
    },
    trails: {
      count: 2,
      timeout: 20,
      rotate: false,
      move: true,
      rotate: true,
      sprite: "bat"
    },
    cluster: {
      circle: false,
      object: "pumpkin_slice",
      speed: 15,
      count: 3
    }
  },
  pumpkin_slice: {
    size: 6,
    weight: 1,
    timeout: 200,
    damage: 30,
    events: {
      ground: "die",
      explosion: "die",
      die: "explode"
    },
    object_events: {
      player: "die"
    },
    animation: {
      air_spin: true,
      sprite: "pumpkin-slice"
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 2,
      timeout: 20,
      rotate: false,
      move: true,
      sprite: "ball-orange"
    }
  },
  paingiver: {
    size: 20,
    weight: 1,
    damage: 50,
    cluster: {
      circle: false,
      object: "grenade",
      speed: 15,
      count: 3
    },
    events: {
      ground: "die",
      die: "cluster"
    },
    object_events: {
      player: "die"
    },
    animation: {
      sprite: "rocket"
    },
    audio: {
      air: "fly"
    },
    trails: {
      count: 1,
      timeout: 10,
      rotate: false,
      move: true,
      sprite: "flame"
    }
  }
};

// prep objects
config.object_refs = [];
for (key in config.objects) {
  config.object_refs.push(key);
  config.objects[key] = deepmerge(config.objects.default, config.objects[key], {
    arrayMerge: dont_merge
  });
}
