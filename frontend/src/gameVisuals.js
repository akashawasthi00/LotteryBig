import aviatorIcon from './assets/game-icons/aviator.svg';
import bigSmallIcon from './assets/game-icons/big-small.svg';
import boomIcon from './assets/game-icons/boom.svg';
import colourTradingIcon from './assets/game-icons/colour-trading.svg';
import defaultIcon from './assets/game-icons/default.svg';
import limboIcon from './assets/game-icons/limbo.svg';
import ludoIcon from './assets/game-icons/ludo.svg';
import pokerIcon from './assets/game-icons/poker.svg';
import vortexIcon from './assets/game-icons/vortex.svg';

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
  'colour-trading': colourTradingIcon,
  'color-trading': colourTradingIcon,
  'big-small': bigSmallIcon,
  'lottery': colourTradingIcon,
  'poker': pokerIcon,
  'aviator': aviatorIcon,
  'ludo': ludoIcon,
  'boom': boomIcon,
  'vortex': vortexIcon,
  'limbo': limboIcon
};

export function getGameIcon(name) {
  const slug = getGameSlug(name);
  return iconBySlug[slug] || defaultIcon;
}
