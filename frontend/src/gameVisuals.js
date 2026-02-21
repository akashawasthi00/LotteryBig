export function getGameSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function getGameBadge(name) {
  const words = (name || '').split(' ').filter(Boolean);
  if (words.length === 0) return 'GM';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

const iconBySlug = {
  'colour-trading': '/game-icons/colour-trading.svg',
  'big-small': '/game-icons/big-small.svg',
  'poker': '/game-icons/poker.svg',
  'aviator': '/game-icons/aviator.svg',
  'ludo': '/game-icons/ludo.svg',
  'boom': '/game-icons/boom.svg',
  'vortex': '/game-icons/vortex.svg',
  'limbo': '/game-icons/limbo.svg'
};

export function getGameIcon(name) {
  const slug = getGameSlug(name);
  return iconBySlug[slug] || '/game-icons/default.svg';
}
