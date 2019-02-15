var schemes = schemes || {};
schemes.deathmatch = {
  title: "Deathmatch",
  time_limit: 5800,
  destroy_land: true,
  gravity: 2,
  score: true,
  drops: {
    crate: {
      time: 100,
      max: 1
    },
    medpack: {
      time: 100,
      add: 30,
      max: 1
    },
    "gem-1": {
      time: 100,
      max: 5
    },
    "gem-5": {
      time: 150,
      max: 1
    },
    "gem-20": {
      time: 500,
      max: 1
    }
  },
  weapons: {
    dig: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    phaser: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    bazookoid: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    grenade: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    punch: {
      start_count: -1,
      crate_chance: 0,
      crate_count: -1
    },
    pumpkin: {
      start_count: 0,
      crate_chance: 1,
      crate_count: 5
    },
    paingiver: {
      start_count: 0,
      crate_chance: 1,
      crate_count: 5
    }
  },
  mapgen: {
    type: "random",
    src: "",
    gap: 20,
    w: 1900,
    h: 1400,
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
