var schemes = schemes || {};
schemes.default = {
  title: "",
  description: "",
  time_limit: 0,
  show_time: false,
  destroy_land: true,
  gravity_type: "land",
  gravity: 1,
  stars: {},
  score: false,
  health: true,
  levels: {
    score: [
      0,
      10,
      25,
      40,
      60,
      90,
      120,
      150,
      200,
      250,
      300,
      360,
      420,
      490,
      570,
      650,
      720,
      810,
      900,
      1000
    ],
    health: [
      100,
      120,
      120,
      120,
      140,
      140,
      140,
      140,
      160,
      180,
      200,
      200,
      200,
      200,
      220,
      220,
      220,
      220,
      240,
      300
    ],
    damage: [
      0,
      10,
      10,
      15,
      15,
      15,
      15,
      20,
      20,
      25,
      25,
      25,
      30,
      30,
      30,
      30,
      35,
      35,
      35,
      50
    ],
    speed: [
      4,
      6,
      8,
      8,
      8,
      8,
      10,
      10,
      10,
      12,
      12,
      12,
      12,
      14,
      14,
      14,
      14,
      16,
      16,
      20
    ],
    jump: [
      10,
      12,
      12,
      12,
      12,
      15,
      15,
      15,
      15,
      18,
      18,
      20,
      20,
      20,
      20,
      20,
      20,
      20,
      20,
      25
    ]
  },
  drops: {
    crate: {
      time: 0,
      max: 20
    },
    medpack: {
      time: 0,
      add: 30,
      max: 50
    },
    nuclear: {
      time: 0,
      max: 20
    },
    target: {
      time: 0,
      max: 100
    },
    asteroid_center: {
      time: 0,
      increase_frequency: false,
      max: 30
    },
    "gem-1": {
      time: 0,
      max: 20
    }
  },
  weapons: {
    dig: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    phaser: {
      start_count: 0,
      crate_chance: 0,
      crate_count: -1
    },
    bazookoid: {
      start_count: 0,
      crate_chance: 0,
      crate_count: -1
    },
    grenade: {
      start_count: 0,
      crate_chance: 0,
      crate_count: -1
    },
    punch: {
      start_count: 0,
      crate_chance: 0,
      crate_count: -1
    },
    pumpkin: {
      start_count: 0,
      crate_chance: 0,
      crate_count: 1
    },
    paingiver: {
      start_count: 0,
      crate_chance: 0,
      crate_count: 10
    }
  },
  armoury: [
    "dig",
    "phaser",
    "bazookoid",
    "grenade",
    "punch",
    "pumpkin",
    "paingiver"
  ],
  arrows: {
    nuclear: "green",
    player: "red",
    target: "blue",
    "asteroid-small": "grey",
    "asteroid-large": "grey",
    vortex: "purple",
    crate: "blue"
  },
  spawn: [],
  mapgen: {
    type: "random",
    src: "",
    gap: 20,
    w: 1000,
    h: 1000,
    blobs: [],
    decorations: true,
    small_blobs: 5,
    large_blobs: 3
  },
  events: {
    frame: {},
    collect: {},
    destroy: {},
    timeout: {},
    destroy_obj_type: {},
    destroy_obj_player: {}
  }
};
