import { esc } from '../utils/html.js';
import { coverUrl } from './instagram-feed.js';
import { matchesPostCategory } from '../utils/post-filter.js';
export function tiktokFeedMarkup(posts) {
  const videos = posts.filter(post => matchesPostCategory(post, 'TikTok'));
  return `<div class="tiktok-profile"><img src="src/assets/charmy-logo.png" alt="Logo Charmy"><h3>Charmy</h3><p>Prévia TikTok · Planejamento</p><small>Simulação visual dos conteúdos previstos para TikTok.</small></div><div class="tiktok-tabs">▦ Vídeos</div><div class="tiktok-grid">${videos.map(post=>`<button class="tiktok-tile" type="button" data-id="${esc(post.id)}" aria-label="Abrir ${esc(post.title)}">${coverUrl(post)?`<img src="${esc(coverUrl(post))}" alt="${esc(post.title)}" loading="lazy">`:`<span class="feed-placeholder"><i>Charmy ♪</i><strong>${esc(post.title)}</strong><small>Escolher capa</small></span>`}<span class="tiktok-date">${esc(post.date.slice(8))}/12</span><span class="tiktok-tile-caption">▷ ${esc(post.title)}</span></button>`).join('') || '<p class="empty">Nenhum post de TikTok para os filtros selecionados.</p>'}</div>`;
}
