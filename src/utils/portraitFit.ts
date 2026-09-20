// Founder/leader portraits are shown in fixed-ratio frames. Photos that already
// have nearly the frame's shape (e.g. 3:2 or 4:3 into a 4:3 frame) fill it with
// `cover` and a focal point that keeps the face and upper body in view; anything
// with a very different shape (tall/portrait uploads) stays `contain` so nothing
// important is ever cut off. The image file itself is never modified.
export function focalPoint(key: string): string {
  // Nishant's photo is 3:2 with him right of centre — keep his face/shoulders centred.
  if (key.toLowerCase().includes('nishant')) return '64% 30%';
  return '50% 30%';
}

export function chooseFit(img: HTMLImageElement): 'cover' | 'contain' {
  const frame = img.clientWidth / img.clientHeight;
  const natural = img.naturalWidth / img.naturalHeight;
  if (!frame || !natural || !isFinite(frame) || !isFinite(natural)) return 'contain';
  const ratio = natural / frame;
  return ratio >= 0.85 && ratio <= 1.2 ? 'cover' : 'contain';
}
