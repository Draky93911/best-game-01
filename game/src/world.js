// The world: everything the game simulates, with no drawing and no DOM, so
// the same step can run in the browser loop and in a headless rehearsal.
// A lumen moth gathers falling light-orbs, dodges void shards, and clears
// five waves; clearing the fifth breaks the dawn and wins the game.
import {
  COMBO_WINDOW, FIELD, MAX_MULTIPLIER, ORB, ORBS_PER_WAVE, PICKUP,
  PLAYER, SCORE, SHARD, WAVES, WIN_WAVE,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_WAVE = 8;
export const EVENT_COLLECT = 16;
export const EVENT_PICKUP = 32;

export const KIND_ORB = 'orb';
export const KIND_SHARD = 'shard';
export const KIND_SHIELD = 'shield';
export const KIND_STAR = 'star';
export const KIND_HEART = 'heart';

function makeStars(random, count, depth) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: random.range(0, FIELD.width),
      y: random.range(0, FIELD.height),
      r: random.range(0.6, 2.2) * depth,
      twinkle: random.range(0, Math.PI * 2),
      depth,
    });
  }
  return stars;
}

export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    wave: 1,
    waveOrbs: 0,
    hull: PLAYER.hull,
    maxHull: PLAYER.hull,
    shield: false,
    orbsCollected: 0,
    shardsDodged: 0,
    player: {
      x: FIELD.width / 2, y: FIELD.height - 130,
      vx: 0, vy: 0, radius: PLAYER.radius,
      dashTime: 0, dashCooldown: 0, invulnerable: 0, wing: 0,
    },
    items: [],
    particles: [],
    floats: [],
    stars: [
      ...makeStars(random, 70, 0.4),
      ...makeStars(random, 50, 0.7),
      ...makeStars(random, 30, 1),
    ],
    nebulae: [
      { x: 240, y: 180, r: 300, hue: 268 },
      { x: 1020, y: 300, r: 340, hue: 190 },
      { x: 620, y: 680, r: 280, hue: 320 },
    ],
    shake: 0,
    flash: 0,
    orbTimer: 0.4,
    shardTimer: 1.2,
    pickupTimer: 9,
    won: false,
    over: false,
  };

  function spawnOrb() {
    state.items.push({
      kind: KIND_ORB, active: true,
      x: random.range(30, FIELD.width - 30), y: -20,
      vx: 0, vy: ORB.fallSpeed * random.range(0.85, 1.2),
      radius: ORB.radius, sway: random.range(0, Math.PI * 2),
      swaySpeed: random.range(0.8, 1.6), spin: random.range(0, Math.PI * 2),
    });
  }

  function spawnShard(speed) {
    state.items.push({
      kind: KIND_SHARD, active: true,
      x: random.range(30, FIELD.width - 30), y: -24,
      vx: random.range(-30, 30), vy: speed * random.range(0.9, 1.15),
      radius: SHARD.radius * random.range(0.85, 1.25),
      wobble: random.range(0, Math.PI * 2),
      spin: random.range(-1.4, 1.4), angle: random.range(0, Math.PI * 2),
    });
  }

  function spawnPickup() {
    const roll = random.next();
    const kind = roll < 0.45 ? KIND_SHIELD : roll < 0.8 ? KIND_STAR : KIND_HEART;
    state.items.push({
      kind, active: true,
      x: random.range(40, FIELD.width - 40), y: -20,
      vx: 0, vy: 70, radius: PICKUP.radius,
      sway: random.range(0, Math.PI * 2), swaySpeed: 1.2, spin: 0,
    });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, Math.PI * 2);
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        life: random.range(0.35, 0.8), maxLife: 0.8,
        radius: random.range(1.5, 3.5), color,
      });
    }
  }

  function floatText(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 1 });
  }

  function waveConfig() {
    return WAVES[Math.min(state.wave, WIN_WAVE) - 1];
  }

  function reset() {
    const keepBest = state.best;
    const { state: fresh } = createWorld(random);
    Object.assign(state, fresh, { best: keepBest });
    state.player.x = FIELD.width / 2;
    state.player.y = FIELD.height - 130;
  }

  // move: {x, y} -1..1 (keyboard) or a steer-to point {tx, ty} (mouse);
  // dash: true on the frame the player dashes. attract: title-screen drift.
  function step(dt, move, dash, attract) {
    if (state.over || state.won) return 0;
    let events = 0;
    state.time += dt;
    const p = state.player;
    p.wing += dt * 14;
    if (p.invulnerable > 0) p.invulnerable -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2.5);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }

    // --- player movement ---
    let ax = 0;
    let ay = 0;
    if (move && move.tx !== undefined) {
      const dx = move.tx - p.x;
      const dy = move.ty - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        ax = (dx / dist) * PLAYER.accel;
        ay = (dy / dist) * PLAYER.accel;
      }
    } else if (move) {
      ax = move.x * PLAYER.accel;
      ay = move.y * PLAYER.accel;
    }
    if (dash && p.dashCooldown <= 0 && p.dashTime <= 0) {
      p.dashTime = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown;
      events |= EVENT_PICKUP;
    }
    const speed = p.dashTime > 0 ? PLAYER.dashSpeed : PLAYER.maxSpeed;
    if (p.dashTime > 0) p.dashTime -= dt;
    p.vx += ax * dt;
    p.vy += ay * dt;
    const drag = Math.exp(-PLAYER.friction * dt);
    p.vx *= drag;
    p.vy *= drag;
    const v = Math.hypot(p.vx, p.vy);
    if (v > speed) {
      p.vx = (p.vx / v) * speed;
      p.vy = (p.vy / v) * speed;
    }
    p.x = Math.min(FIELD.width - p.radius, Math.max(p.radius, p.x + p.vx * dt));
    p.y = Math.min(FIELD.height - p.radius, Math.max(p.radius, p.y + p.vy * dt));

    // --- title-screen drift: orbs fall, nothing can hurt ---
    if (attract) {
      state.orbTimer -= dt;
      if (state.orbTimer <= 0) {
        state.orbTimer = 0.7;
        spawnOrb();
      }
      advanceItems(dt, true);
      advanceFx(dt);
      return 0;
    }

    // --- spawning ---
    const cfg = waveConfig();
    state.orbTimer -= dt;
    if (state.orbTimer <= 0) {
      state.orbTimer = cfg.orbEvery * random.range(0.85, 1.15);
      spawnOrb();
    }
    state.shardTimer -= dt;
    if (state.shardTimer <= 0) {
      state.shardTimer = cfg.shardEvery * random.range(0.85, 1.15);
      spawnShard(cfg.shardSpeed);
    }
    state.pickupTimer -= dt;
    if (state.pickupTimer <= 0) {
      state.pickupTimer = random.range(9, 14);
      spawnPickup();
    }

    advanceItems(dt, false);

    // --- collisions ---
    for (const item of state.items) {
      if (!item.active) continue;
      const dx = item.x - p.x;
      const dy = item.y - p.y;
      const reach = item.radius + p.radius - 2;
      if (dx * dx + dy * dy > reach * reach) continue;
      if (item.kind === KIND_ORB) {
        item.active = false;
        state.orbsCollected += 1;
        state.waveOrbs += 1;
        state.combo += 1;
        state.comboTimer = COMBO_WINDOW;
        state.multiplier = Math.min(1 + Math.floor(state.combo / 5), MAX_MULTIPLIER);
        const gained = ORB.value * state.multiplier;
        state.score += gained;
        burst(item.x, item.y, '#ffd166', 10, 160);
        floatText(item.x, item.y - 14, `+${gained}`, '#ffe9a8');
        events |= EVENT_COLLECT;
        if (state.waveOrbs >= ORBS_PER_WAVE) {
          state.waveOrbs = 0;
          if (state.wave >= WIN_WAVE) {
            state.won = true;
            state.score += SCORE.waveClear;
            burst(p.x, p.y, '#9df2ff', 40, 320);
            events |= EVENT_WIN;
          } else {
            state.wave += 1;
            state.score += SCORE.waveClear;
            floatText(p.x, p.y - 40, `WAVE ${state.wave}`, '#9df2ff');
            events |= EVENT_WAVE;
          }
        }
      } else if (item.kind === KIND_SHARD) {
        item.active = false;
        if (p.invulnerable > 0 || p.dashTime > 0) {
          burst(item.x, item.y, '#c77dff', 8, 140);
          continue;
        }
        if (state.shield) {
          state.shield = false;
          burst(item.x, item.y, '#7ef9e3', 14, 200);
          floatText(p.x, p.y - 30, 'SHIELD DOWN', '#7ef9e3');
          p.invulnerable = PLAYER.invulnerableTime;
          state.shake = 0.6;
          events |= EVENT_HIT;
          continue;
        }
        state.hull -= 1;
        state.combo = 0;
        state.multiplier = 1;
        p.invulnerable = PLAYER.invulnerableTime;
        state.shake = 1;
        state.flash = 0.7;
        burst(p.x, p.y, '#ff5d8f', 22, 260);
        events |= EVENT_HIT;
        if (state.hull <= 0) {
          state.over = true;
          burst(p.x, p.y, '#ff8fa3', 46, 380);
          events |= EVENT_OVER;
        }
      } else {
        item.active = false;
        if (item.kind === KIND_SHIELD) {
          state.shield = true;
          floatText(p.x, p.y - 30, 'SHIELD UP', '#7ef9e3');
        } else if (item.kind === KIND_STAR) {
          state.score += SCORE.star;
          floatText(p.x, p.y - 30, `+${SCORE.star}`, '#ffd166');
        } else if (item.kind === KIND_HEART) {
          state.hull = Math.min(state.maxHull, state.hull + 1);
          floatText(p.x, p.y - 30, '+1 HULL', '#ff8fa3');
        }
        burst(item.x, item.y, '#ffffff', 12, 180);
        events |= EVENT_PICKUP;
      }
    }

    advanceFx(dt);
    return events;
  }

  function advanceItems(dt, attract) {
    for (const item of state.items) {
      if (!item.active) continue;
      item.sway += (item.swaySpeed ?? 1) * dt;
      if (item.kind === KIND_ORB || item.kind === KIND_SHIELD || item.kind === KIND_STAR || item.kind === KIND_HEART) {
        item.x += Math.sin(item.sway) * ORB.sway * dt;
      }
      if (item.kind === KIND_SHARD) {
        item.angle += item.spin * dt;
        item.x += Math.sin(item.wobble) * SHARD.wobble * dt + item.vx * dt;
      }
      item.y += item.vy * dt;
      if (item.y > FIELD.height + 40) {
        if (item.kind === KIND_SHARD && !attract) state.shardsDodged += 1;
        item.active = false;
      }
      if (item.x < -40 || item.x > FIELD.width + 40) item.active = false;
    }
    state.items = state.items.filter((i) => i.active);
  }

  function advanceFx(dt) {
    for (const pt of state.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= Math.exp(-2 * dt);
      pt.vy *= Math.exp(-2 * dt);
      pt.life -= dt;
    }
    state.particles = state.particles.filter((pt) => pt.life > 0);
    for (const f of state.floats) {
      f.y -= 34 * dt;
      f.life -= dt * 0.9;
    }
    state.floats = state.floats.filter((f) => f.life > 0);
    for (const s of state.stars) {
      s.twinkle += dt * 2;
      s.y += s.depth * 6 * dt;
      if (s.y > FIELD.height + 2) {
        s.y = -2;
        s.x = random.range(0, FIELD.width);
      }
    }
  }

  return { state, step, reset };
}
