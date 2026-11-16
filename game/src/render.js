// Everything the eye sees: a parallax starfield over three nebula glows, a
// flapping lumen moth, golden orbs, magenta void shards, and the HUD and
// screens. All drawing is canvas 2D with gradients and additive glow; no
// images, no fonts from the network (system fonts only).
import { FIELD, ORBS_PER_WAVE, PLAYER } from './config.js';
import { KIND_HEART, KIND_ORB, KIND_SHARD, KIND_SHIELD, KIND_STAR } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hueColor(hue, light, alpha) {
  return `hsla(${hue}, 85%, ${light}%, ${alpha})`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawBackground(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, '#0b1026');
    g.addColorStop(0.55, '#141038');
    g.addColorStop(1, '#1c0f33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const n of state.nebulae) {
      const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      ng.addColorStop(0, hueColor(n.hue, 55, 0.16));
      ng.addColorStop(1, hueColor(n.hue, 55, 0));
      ctx.fillStyle = ng;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }

    for (const s of state.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(s.twinkle));
      ctx.fillStyle = `rgba(220, 230, 255, ${(a * s.depth).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawOrb(item) {
    const pulse = 1 + 0.12 * Math.sin(item.sway * 2);
    const r = item.radius * pulse;
    const g = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, r * 2.4);
    g.addColorStop(0, 'rgba(255, 209, 102, 0.85)');
    g.addColorStop(0.4, 'rgba(255, 170, 60, 0.28)');
    g.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(item.x, item.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(item.x, item.y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff7dd';
    ctx.beginPath();
    ctx.arc(item.x - r * 0.18, item.y - r * 0.2, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShard(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle);
    const r = item.radius;
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#e07bff');
    g.addColorStop(0.5, '#9d4edd');
    g.addColorStop(1, '#5a189a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.25);
    ctx.lineTo(r * 0.8, -r * 0.3);
    ctx.lineTo(r * 0.55, r * 1.05);
    ctx.lineTo(-r * 0.6, r * 0.9);
    ctx.lineTo(-r * 0.85, -r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 150, 240, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.25, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPickup(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    const bob = Math.sin(item.sway * 2) * 2;
    ctx.translate(0, bob);
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, item.radius * 2.2);
    if (item.kind === KIND_SHIELD) {
      glow.addColorStop(0, 'rgba(126, 249, 227, 0.7)');
      glow.addColorStop(1, 'rgba(126, 249, 227, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#7ef9e3';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#dffff6';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', 0, 1);
    } else if (item.kind === KIND_STAR) {
      glow.addColorStop(0, 'rgba(255, 209, 102, 0.8)');
      glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 === 0 ? item.radius : item.radius * 0.45;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();
    } else if (item.kind === KIND_HEART) {
      glow.addColorStop(0, 'rgba(255, 93, 143, 0.7)');
      glow.addColorStop(1, 'rgba(255, 93, 143, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ff5d8f';
      ctx.beginPath();
      ctx.moveTo(0, item.radius * 0.7);
      ctx.bezierCurveTo(-item.radius * 1.1, -item.radius * 0.2, -item.radius * 0.5, -item.radius * 0.9, 0, -item.radius * 0.3);
      ctx.bezierCurveTo(item.radius * 0.5, -item.radius * 0.9, item.radius * 1.1, -item.radius * 0.2, 0, item.radius * 0.7);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer(state) {
    const p = state.player;
    if (state.over) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invulnerable > 0 && Math.floor(p.invulnerable * 12) % 2 === 0) ctx.globalAlpha = 0.45;
    // Trail glow.
    ctx.globalCompositeOperation = 'lighter';
    const trail = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
    trail.addColorStop(0, 'rgba(157, 242, 255, 0.5)');
    trail.addColorStop(1, 'rgba(157, 242, 255, 0)');
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Wings, flapping with p.wing.
    const flap = Math.sin(p.wing) * 0.55;
    const tilt = Math.max(-0.4, Math.min(0.4, p.vx * 0.0006));
    ctx.rotate(tilt);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(-0.5 - flap * 0.35);
      const wg = ctx.createLinearGradient(0, 0, 34, -14);
      wg.addColorStop(0, 'rgba(189, 224, 254, 0.95)');
      wg.addColorStop(1, 'rgba(144, 224, 239, 0.55)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(16, -8, 20, 10, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body.
    const bg = ctx.createLinearGradient(0, -10, 0, 12);
    bg.addColorStop(0, '#caf0f8');
    bg.addColorStop(1, '#48cae4');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head lamp.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -13, 5, 0, Math.PI * 2);
    ctx.fill();
    // Shield ring.
    if (state.shield) {
      ctx.strokeStyle = 'rgba(126, 249, 227, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloats(state) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px system-ui, sans-serif';
    for (const f of state.floats) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function drawHud(state, screen, best, muted) {
    const pad = 22;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Score block, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillText(String(state.score), pad, 46);
    ctx.fillStyle = 'rgba(200, 210, 255, 0.75)';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, pad, 68);
    // Combo, under the score.
    if (state.combo >= 2) {
      ctx.fillStyle = '#ffd166';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.multiplier}  (${state.combo})`, pad, 96);
      ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
      roundRect(ctx, pad, 104, 130, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      roundRect(ctx, pad, 104, 130 * Math.max(0, state.comboTimer / 3), 6, 3);
      ctx.fill();
    }
    // Wave progress, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(220, 230, 255, 0.9)';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(`WAVE ${state.wave} / 5`, FIELD.width / 2, 40);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    roundRect(ctx, FIELD.width / 2 - 110, 50, 220, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#9df2ff';
    roundRect(ctx, FIELD.width / 2 - 110, 50, 220 * (state.waveOrbs / ORBS_PER_WAVE), 8, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 210, 255, 0.75)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`${state.waveOrbs} / ${ORBS_PER_WAVE} orbs to clear the wave`, FIELD.width / 2, 76);
    // Hull hearts + dash, top right.
    ctx.textAlign = 'right';
    for (let i = 0; i < state.maxHull; i += 1) {
      const x = FIELD.width - pad - i * 32;
      const y = 36;
      ctx.fillStyle = i < state.hull ? '#ff5d8f' : 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.bezierCurveTo(x - 13, y - 3, x - 6, y - 11, x, y - 4);
      ctx.bezierCurveTo(x + 6, y - 11, x + 13, y - 3, x, y + 8);
      ctx.fill();
    }
    if (state.shield) {
      ctx.fillStyle = '#7ef9e3';
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.fillText('SHIELD', FIELD.width - pad, 66);
    }
    const dashReady = state.player.dashCooldown <= 0;
    ctx.fillStyle = dashReady ? '#9df2ff' : 'rgba(255, 255, 255, 0.35)';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText(dashReady ? 'DASH READY  [SPACE]' : 'DASH …', FIELD.width - pad, 88);
    // Mute state, bottom right.
    ctx.fillStyle = 'rgba(200, 210, 255, 0.6)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(muted ? 'MUTED  [M]' : 'SOUND ON  [M]', FIELD.width - pad, FIELD.height - 18);
    // Controls hint, bottom left.
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(200, 210, 255, 0.6)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('WASD / ARROWS / MOUSE — MOVE      SPACE — DASH      P — PAUSE', pad, FIELD.height - 18);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(8, 10, 30, 0.6)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 54px system-ui, sans-serif';
      ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 8);
      ctx.fillStyle = 'rgba(200, 210, 255, 0.85)';
      ctx.font = '600 19px system-ui, sans-serif';
      ctx.fillText('Press P or Space to keep flying', FIELD.width / 2, FIELD.height / 2 + 34);
    }
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(10, 14, 38, 0.72)';
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(157, 242, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.save();
    ctx.textAlign = 'center';
    const cx = FIELD.width / 2;
    // Title glow.
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(cx, 215, 0, cx, 215, 330);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.22)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 330, 0, 660, 430);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(157, 242, 255, 0.95)';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText('A  LITTLE  LIGHT  AGAINST  THE  DARK', cx, 128);
    const title = ctx.createLinearGradient(cx - 320, 0, cx + 320, 0);
    title.addColorStop(0, '#ffd166');
    title.addColorStop(0.5, '#fff7dd');
    title.addColorStop(1, '#9df2ff');
    ctx.fillStyle = title;
    ctx.font = '800 96px system-ui, sans-serif';
    ctx.fillText('LUMEN DRIFT', cx, 232);
    ctx.fillStyle = 'rgba(220, 230, 255, 0.9)';
    ctx.font = '600 21px system-ui, sans-serif';
    ctx.fillText('Guide the lumen moth through the nebula. Gather light, dodge the void,', cx, 282);
    ctx.fillText('clear all five waves — and break the dawn.', cx, 312);
    panel(cx - 330, 352, 660, 168);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.fillText('HOW TO PLAY', cx, 388);
    ctx.fillStyle = 'rgba(220, 230, 255, 0.9)';
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('Move — WASD, arrow keys, or your mouse', cx, 422);
    ctx.fillText('Dash — Space or click (brief shield while dashing)', cx, 450);
    ctx.fillText('Orbs feed your combo — shards cost a hull. Three hulls, five waves.', cx, 478);
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd166';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText('PRESS SPACE OR CLICK TO BEGIN', cx, 578);
    ctx.globalAlpha = 1;
    if (best > 0) {
      ctx.fillStyle = 'rgba(200, 210, 255, 0.85)';
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillText(`Best score: ${best}`, cx, 618);
    }
    ctx.restore();
  }

  function drawEnd(state, best, won) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 30, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    const cx = FIELD.width / 2;
    const title = won ? 'DAWN BREAKS' : 'THE LIGHT FADES';
    const grad = ctx.createLinearGradient(cx - 300, 0, cx + 300, 0);
    if (won) {
      grad.addColorStop(0, '#ffd166');
      grad.addColorStop(0.5, '#fff7dd');
      grad.addColorStop(1, '#9df2ff');
    } else {
      grad.addColorStop(0, '#ff5d8f');
      grad.addColorStop(0.5, '#ffb3c6');
      grad.addColorStop(1, '#c77dff');
    }
    ctx.fillStyle = grad;
    ctx.font = '800 76px system-ui, sans-serif';
    ctx.fillText(title, cx, 250);
    ctx.fillStyle = 'rgba(220, 230, 255, 0.92)';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText(
      won ? 'Five waves cleared. The nebula is lit again.' : 'The void caught the moth this time.',
      cx, 300,
    );
    panel(cx - 250, 348, 500, 190);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.fillText(`SCORE  ${state.score}`, cx, 412);
    ctx.fillStyle = 'rgba(220, 230, 255, 0.9)';
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText(`Best  ${Math.max(best, state.score)}`, cx, 452);
    ctx.fillText(
      `Orbs ${state.orbsCollected}   •   Shards dodged ${state.shardsDodged}   •   Wave ${state.wave}   •   ${Math.floor(state.time)}s`,
      cx, 488,
    );
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd166';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText('PRESS R OR SPACE TO FLY AGAIN', cx, 596);
    ctx.restore();
  }

  function draw(state, screen, best, muted) {
    const scaleX = canvas.width / FIELD.width;
    const scaleY = canvas.height / FIELD.height;
    const scale = Math.min(scaleX, scaleY);
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 14, (Math.random() - 0.5) * state.shake * 14);
    }
    drawBackground(state);
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_ORB) drawOrb(item);
      else if (item.kind === KIND_SHARD) drawShard(item);
      else drawPickup(item);
    }
    drawParticles(state);
    if (screen !== SCREEN_TITLE && screen !== SCREEN_OVER) drawPlayer(state);
    drawFloats(state);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 110, ${(state.flash * 0.25).toFixed(3)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      drawPlayer(state);
      drawTitle(state, best);
    } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      drawEnd(state, best, screen === SCREEN_WIN);
    } else {
      drawHud(state, screen, best, muted);
    }
    ctx.restore();
  }

  return { draw };
}
