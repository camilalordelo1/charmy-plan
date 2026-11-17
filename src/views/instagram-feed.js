import { esc } from '../utils/html.js';
import { mediaPreviews } from '../data/media-previews.js';
export function coverUrl(post) {
  return mediaPreviews[post.cover] || '';
}
export function postCaption(post) {
  const notes = post.notes || '';
  const caption = notes.match(/(?:^|\n)LEGENDA\s*\n([\s\S]*?)(?=\nCTA\s*\n|$)/)?.[1]?.trim();
  const cta = notes.match(/(?:^|\n)CTA\s*\n([\s\S]*)/)?.[1]?.trim();
  return caption && caption !== '-' ? [caption, cta].filter(Boolean).join('\n\n') : '';
}
export function feedMarkup(posts) {
  return `<div class="instagram-profile"><span class="profile-logo">C</span><div><h3>Charmy</h3><p>Prévia do feed · Dezembro 2026</p><small>Escolha a capa em Editar post. A simulação não publica no Instagram.</small></div></div><div class="instagram-grid">${posts.map(p=>`<button type="button" class="feed-tile" data-id="${esc(p.id)}" aria-label="Abrir ${esc(p.title)}">${coverUrl(p)?`<img src="${esc(coverUrl(p))}" alt="${esc(p.title)}" loading="lazy">`:`<span class="feed-placeholder"><i>Charmy ✦</i><strong>${esc(p.title)}</strong><small>Escolher capa</small></span>`}<span class="feed-format">${esc(p.format)}</span><span class="feed-date">${esc(p.date.slice(8))}/12</span></button>`).join('') || '<p class="empty">Nenhum post para os filtros selecionados.</p>'}</div>`;
}
