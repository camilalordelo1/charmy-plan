import { highlightsMarkup } from "./highlights.js";
import { uploaded, isVideoUpload } from "../services/uploads.js";
import { esc } from "../utils/html.js";
import { mediaPreviews } from "../data/media-previews.js";
import { postArtwork } from "../data/post-artworks.js";
import { postMedia } from "../data/post-media.js";
import { videoPreviews } from "../data/video-previews.js";
import { imagePreview } from "../utils/image-preview.js";
import { postProposal } from "../services/post-proposal.js";
export function postCoverUrl(post) {
  const media = postMedia(post);
  const upload = uploaded(post);
  if (media && (!upload || isVideoUpload(post))) return imagePreview(media.cover, "thumb");
  return imagePreview(upload?.url || mediaPreviews[post.cover] || postArtwork(post)?.slides[0].src || postProposal(post)?.src || "", "thumb");
}
export function coverUrl(post) {
  return uploaded(post)?.url || postMedia(post)?.src || videoPreviews[post.cover]?.src || imagePreview(mediaPreviews[post.cover] || postArtwork(post)?.slides[0].src || postProposal(post)?.src || "");
}
export function postCaption(post) {
  const notes = post.notes || "";
  const caption = notes
    .match(/(?:^|\n)LEGENDA\s*\n([\s\S]*?)(?=\nCTA\s*\n|$)/)?.[1]
    ?.trim();
  const cta = notes.match(/(?:^|\n)CTA\s*\n([\s\S]*)/)?.[1]?.trim();
  return caption && caption !== "-"
    ? [caption, cta].filter(Boolean).join("\n\n")
    : "";
}
export function feedMarkup(posts) {
  const ordered = [...posts].sort((a, b) =>
    (b.date + b.time).localeCompare(a.date + a.time),
  );
  const stories = ordered.filter((p) => p.format === "Stories");
  posts = ordered.filter((p) => p.format !== "Stories");
  const avatar = stories.length
    ? `<button class="profile-stories-trigger" type="button" data-story="${esc(stories[0].id)}" aria-label="Abrir ${stories.length} Stories da Charmy"><img class="profile-avatar" src="src/assets/charmy-logo.png" alt="Logo Charmy"><span>Ver Stories</span></button>`
    : '<img class="profile-avatar" src="src/assets/charmy-logo.png" alt="Logo Charmy">';

  return `<div class="instagram-feed-page"><div class="instagram-profile profile-preview">${avatar}<div class="profile-info"><h3>charmyclube <span aria-hidden="true">···</span></h3><div class="profile-stats"><span><b>2.662</b> posts</span><span><b>878 mil</b> seguidores</span><span><b>159</b> seguindo</span></div><strong>Charmy | Moda Teen</strong><p class="profile-category">Vestuário (marca)</p><p class="profile-bio">💗 Roupas estilosas para meninas descoladas<br>✨ Produção própria | Tamanhos 10 ao 18<br>🚚 Enviamos para todo o Brasil<br>👇 Escolha seu próximo look!</p><a href="https://linktr.ee/charmyclube" target="_blank" rel="noopener">linktr.ee/charmyclube ↗</a><small class="profile-reference">Simulação do perfil · números conforme referência enviada</small></div></div>${highlightsMarkup()}<div class="instagram-grid">${posts.map((p) => `<button type="button" class="feed-tile" data-id="${esc(p.id)}" aria-label="Abrir ${esc(p.title)}">${isVideoUpload(p) && !postMedia(p) ? `<video muted preload="metadata" src="${esc(coverUrl(p))}#t=0.1"></video>` : postCoverUrl(p) ? `<img decoding="async" src="${esc(postCoverUrl(p))}" alt="${esc(p.title)}" loading="lazy">` : `<span class="feed-placeholder"><i>Charmy ✦</i><strong>${esc(p.title)}</strong><small>Escolher capa</small></span>`}<span class="feed-format">${esc(p.format)}</span><span class="feed-date">${esc(p.date.slice(8))}/12</span></button>`).join("") || '<p class="empty">Nenhum post para os filtros selecionados.</p>'}</div></div>`;
}
