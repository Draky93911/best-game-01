// Lumen Drift — shared tuning numbers. One place for every value the
// world, the renderer and the screenshot stager agree on.
export const VIEW = { width: 1280, height: 800 };
export const FIELD = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const BEST_KEY = 'lumen-drift-best';

export const PLAYER = {
  radius: 16,
  accel: 2600,
  maxSpeed: 460,
  friction: 6.5,
  hull: 3,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 1.4,
  invulnerableTime: 1.2,
};

export const ORB = { radius: 11, value: 10, fallSpeed: 72, sway: 26 };
export const SHARD = { radius: 15, fallSpeed: 120, wobble: 40 };
export const PICKUP = { radius: 14 };

// Orbs to gather before the wave turns over; wave 5 cleared wins the game.
export const ORBS_PER_WAVE = 15;
export const WIN_WAVE = 5;
export const COMBO_WINDOW = 3;
export const MAX_MULTIPLIER = 5;

// Spawn pacing per wave: [orbInterval, shardInterval, shardSpeed].
export const WAVES = [
  { orbEvery: 0.8, shardEvery: 1.9, shardSpeed: 120 },
  { orbEvery: 0.74, shardEvery: 1.55, shardSpeed: 145 },
  { orbEvery: 0.68, shardEvery: 1.3, shardSpeed: 170 },
  { orbEvery: 0.62, shardEvery: 1.1, shardSpeed: 195 },
  { orbEvery: 0.58, shardEvery: 0.95, shardSpeed: 220 },
];

export const SCORE = { star: 250, waveClear: 100 };
