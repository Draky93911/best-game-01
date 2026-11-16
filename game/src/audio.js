// All sound is synthesized with the Web Audio API: short oscillator blips
// and filtered noise, no audio files, nothing fetched. The context is
// created lazily on the first player gesture (browsers block audio before
// one) and every call is guarded, so a silent environment never breaks play.
export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(master);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // Sound is garnish: never let it interrupt the game.
    }
  }

  function noise(dur, vol, lowpass) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter).connect(gain).connect(master);
      src.start();
    } catch {
      // Sound is garnish: never let it interrupt the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    collect(combo) {
      const base = 520 + Math.min(combo, 12) * 36;
      tone(base, 0.12, 'sine', 0.5, base * 1.6);
    },
    star() {
      tone(660, 0.1, 'triangle', 0.5);
      setTimeout(() => tone(880, 0.12, 'triangle', 0.5), 70);
      setTimeout(() => tone(1320, 0.18, 'triangle', 0.45), 140);
    },
    shield() {
      tone(300, 0.2, 'sine', 0.45, 620);
    },
    heart() {
      tone(440, 0.14, 'sine', 0.45, 660);
      setTimeout(() => tone(660, 0.16, 'sine', 0.4, 880), 110);
    },
    hit() {
      noise(0.22, 0.7, 900);
      tone(140, 0.25, 'sawtooth', 0.4, 60);
    },
    dash() {
      noise(0.12, 0.25, 2400);
    },
    wave() {
      tone(392, 0.14, 'triangle', 0.45);
      setTimeout(() => tone(523, 0.14, 'triangle', 0.45), 120);
      setTimeout(() => tone(659, 0.2, 'triangle', 0.4), 240);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.5), i * 130));
    },
    over() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.32, 'sine', 0.45), i * 170));
    },
  };
}
