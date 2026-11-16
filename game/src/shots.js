// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot, so the frame is what a real game looks like and the
// same seed always gives the same frame. The win scene's pilot is careful
// and the end scene's is reckless, so one clears the dawn and the other
// gets caught — both by the rules, not by staging the picture.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, KIND_ORB, KIND_SHARD } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const WIN_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward the nearest orb, pushed away from shards that are close.
 *  A reckless pilot does the opposite: it chases the nearest shard, the way
 *  a hurried player blunders into danger, so the end scene really ends. */
function autopilot(state, reckless) {
  const p = state.player;
  if (reckless) {
    let shard = null;
    let shardDist = Infinity;
    for (const item of state.items) {
      if (!item.active || item.kind !== KIND_SHARD) continue;
      const d = Math.hypot(item.x - p.x, item.y - p.y);
      if (d < shardDist) {
        shardDist = d;
        shard = item;
      }
    }
    if (shard) {
      const len = Math.max(shardDist, 1);
      return { x: (shard.x - p.x) / len, y: (shard.y - p.y) / len };
    }
    return { x: 0, y: 1 };
  }
  let orb = null;
  let orbDist = Infinity;
  for (const item of state.items) {
    if (!item.active || item.kind !== KIND_ORB) continue;
    const d = Math.hypot(item.x - p.x, item.y - p.y);
    if (d < orbDist) {
      orbDist = d;
      orb = item;
    }
  }
  let ax = 0;
  let ay = 0;
  if (orb) {
    ax += (orb.x - p.x) / Math.max(orbDist, 1);
    ay += (orb.y - p.y) / Math.max(orbDist, 1);
  } else {
    ax += (FIELD.width / 2 - p.x) / FIELD.width;
    ay -= 0.4;
  }
  for (const item of state.items) {
    if (!item.active || item.kind !== KIND_SHARD) continue;
    const dx = p.x - item.x;
    const dy = p.y - item.y;
    const d = Math.hypot(dx, dy);
    if (d < 170 && d > 1) {
      const push = ((170 - d) / 170) * 2.2;
      ax += (dx / d) * push;
      ay += (dy / d) * push;
    }
  }
  const len = Math.hypot(ax, ay) || 1;
  return { x: ax / len, y: ay / len };
}

function dashNow(state) {
  const p = state.player;
  for (const item of state.items) {
    if (!item.active || item.kind !== KIND_SHARD) continue;
    const d = Math.hypot(item.x - p.x, item.y - p.y);
    if (d < 70) return true;
  }
  return false;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any other name stages the title screen.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'play' ? PLAY_SECONDS : name === 'win' ? WIN_LIMIT_SECONDS : END_LIMIT_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    // The end scene's pilot flies well for the first 20 s, then gets
    // reckless and chases the shards: a real mid-game death, not an
    // instant one at the start line.
    const reckless = name === 'end' && i * STEP > 20;
    const move = autopilot(world.state, reckless);
    const events = world.step(STEP, move, name !== 'end' && dashNow(world.state), false);
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
    if (events & EVENT_OVER) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
