// A soft singing-bowl tone synthesised in WebAudio, so there is no audio file.

let ctx: AudioContext | null = null;

/** Call from a user gesture so iOS lets the context start. */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function bell(): void {
  if (!ctx) return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
  // Slightly inharmonic partials give the bowl its shimmer.
  const partials: [number, number, number][] = [
    [432, 1, 6],
    [432 * 2.71, 0.35, 3.5],
    [432 * 5.12, 0.12, 2],
    [434.5, 0.5, 6],
  ];
  for (const [freq, amp, decay] of partials) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(amp, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + decay + 0.1);
  }
}
