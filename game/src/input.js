// Keyboard and mouse input. Movement is a -1..1 vector from WASD or the
// arrow keys; the mouse steers instead while it is moving (the ship eases
// toward the pointer). Space / click confirms and dashes, P pauses,
// R restarts from an end screen, M mutes. Actions are consumed once per
// frame by takeActions(), so a held key never double-fires.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouse = null;
  let mouseAge = Infinity;

  function keyOf(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const key = keyOf(event);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === ' ' || key === 'enter') actions |= ACTION_CONFIRM;
    if (key === 'p' || key === 'escape') actions |= ACTION_PAUSE;
    if (key === 'r') actions |= ACTION_RESTART;
    if (key === 'm') actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (event) => keys.delete(keyOf(event)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    mouseAge = 0;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    mouseAge = 0;
    actions |= ACTION_CONFIRM;
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // {x, y} in canvas CSS pixels, or null when the mouse is not steering.
    pointer(dt) {
      mouseAge += dt;
      if (!mouse || mouseAge > 2.5) return null;
      return mouse;
    },
    // Keyboard movement vector, each component -1, 0 or 1.
    keys() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return { x, y };
    },
    get dashHeld() {
      return keys.has(' ');
    },
  };
}
