// Calm green-on-dark gradients tied to the project theme.
// Variations stay close to the brand emerald (#009669) on dark surfaces
// (#09090B / #18181A) so avatars feel cohesive with the rest of the UI.
const PALETTE = [
  ['#18181A', '#009669'],
  ['#0f0f12', '#00b27d'],
  ['#1f1f22', '#006b4c'],
  ['#18181A', '#00b27d'],
  ['#222226', '#009669'],
  ['#0f0f12', '#006b4c'],
  ['#18181A', '#00d493'],
  ['#1f1f22', '#009669'],
];

const hashString = (value) => {
  const s = String(value || '');
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const gradientFor = (seed) => {
  const [a, b] = PALETTE[hashString(seed) % PALETTE.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
};

export const initialsOf = (name) => {
  const source = String(name || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
