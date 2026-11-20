function artwork(folder, format, replaceFormat, title, images, zip) {
  const path = `src/assets/posts/${folder}/`;
  return {
    format,
    replaceFormat,
    title,
    width: 1080,
    height: 1350,
    download: path + (zip || images[0][0]),
    slides: images.map(([file, alt]) => ({ src: path + file, alt })),
  };
}

const artworks = {
  "charmy-notion-dec-05": artwork(
    "detalhes-vestido", "Carrossel", "Stories", "Carrossel de detalhes do vestido",
    [
      ["01-capa.png", "Vestido branco com estampa azul, corpo franzido e babados: é nos detalhes que encanta."],
      ["02-estampa.png", "Vestido inteiro com estampa azul e branca. Azul que marca, branco que ilumina."],
      ["03-acabamento.png", "Vestido inteiro com indicações do franzido no corpo e dos babados em camadas."],
      ["04-consulte-tamanhos.png", "Salve para lembrar e consulte os tamanhos no Direct @charmyclube ou WhatsApp (35) 99737-9988."],
    ], "carrossel-vestido-charmy.zip",
  ),
  "charmy-notion-dec-06": artwork(
    "roupa-nova", "Imagem", "Reels", "Arte da Charmozinha sobre roupa nova",
    [["01-arte.png", "Charmozinha: Eu não preciso de roupa nova. Também eu vendo os looks da Charmy, com uma expressão encantada."]],
  ),
  "charmy-notion-dec-11": artwork(
    "seu-estilo", "Carrossel", "Reels", "Carrossel sobre seu próprio estilo",
    [
      ["01-capa.png", "Seu estilo não precisa caber numa caixinha, com um look real do Clube Charmy."],
      ["02-suas-versoes.png", "Você pode ser muitas versões de você. Delicada hoje, diferente amanhã, e está tudo bem."],
      ["03-seu-proprio-charme.png", "Crescer é descobrir seu próprio charme. Envie para uma amiga que está descobrindo seu estilo."],
    ], "carrossel-seu-estilo-charmy.zip",
  ),
  "charmy-notion-dec-13": artwork(
    "troca-de-look", "Imagem", "Stories", "Arte da Charmozinha sobre trocar o look",
    [["01-arte.png", "Charmozinha em um POV: 5 minutos antes de sair, decido trocar só uma peça… e mudo o look inteiro, com blusa, jeans, bolsa e tênis."]],
  ),
};

export function postArtwork(post) {
  return artworks[post.source] || artworks[post.id] || null;
}

// Correct requested formats in existing calendars, preserving other edits.
export function applyArtworkFormat(post) {
  const art = postArtwork(post);
  return art && post.format === art.replaceFormat
    ? { ...post, format: art.format } : post;
}
