import { videoPreviews } from "./video-previews.js";

const mediaByPost = {
  "charmy-notion-dec-02": {
    original: "img/1-base-3-looks.mp4",
    cover: "src/assets/posts/uma-peca-tres-looks/01-capa.png",
    alt: "1 peça, 3 looks: a mesma peça amarela usada como top, saia e vestido.",
  },
  "charmy-notion-dec-04": {
    original: "img/Dezembro-chegou.mp4",
    cover: "src/assets/posts/look-natal/01-capa.png",
    alt: "Seu look de Natal: vestido branco de um ombro só com cinto de correntes prateadas.",
  },
  "charmy-notion-dec-09": {
    original: "img/IMG_6546.mp4",
    cover: "src/assets/posts/monte-um-look/01-capa.png",
    alt: "Monta um look comigo? Uma peça, muitas possibilidades. Apresentadora com top rosa e jeans cargo.",
  },
};

// Both platform previews and saved calendar copies resolve the same association.
export function postMedia(post) {
  const media = mediaByPost[post.source] || mediaByPost[post.id];
  return media ? { ...videoPreviews[media.original], ...media } : null;
}
