import { notionPosts } from "./notion-posts.js";
import { postArtwork } from "./post-artworks.js";
import { highlights } from "./highlights.js";

const feed = notionPosts.flatMap((post) => {
  const artwork = postArtwork(post);
  if (!artwork) return [];
  const date = `${post.date.slice(8)}/${post.date.slice(5, 7)}`;
  return artwork.slides.map((slide, index) => ({
    src: slide.src,
    title: `${date} · ${post.title} · ${index + 1} de ${artwork.slides.length}`,
    alt: slide.alt,
    format: "Feed · 1080 × 1350 px",
    downloadName: `charmy-feed-${post.date}-${index + 1}.png`,
  }));
});

const stories = highlights
  .filter((item) => ["novidades", "como-comprar", "duvidas"].includes(item.id))
  .flatMap((item) => item.slides.map((slide, index) => ({
    src: "src/assets/highlights/" + slide.file,
    title: `${item.title} · ${slide.title}`,
    alt: slide.alt,
    format: "Story · 9:16",
    downloadName: `charmy-story-${item.id}-${index + 1}.png`,
  })));

// Use the same current assets as the posts and highlights, including revisions.
export const artworkLibrary = [...feed, ...stories, {
  src: "src/assets/posts/monte-um-look/01-capa.png",
  title: "09/12 · Monte um look comigo · Capa do Reels",
  alt: "Monta um look comigo? Uma peça, muitas possibilidades. Apresentadora com top rosa e jeans cargo.",
  format: "Capa do Reels · 1080 × 1350 px",
  downloadName: "charmy-capa-reels-2026-12-09.png",
}];
