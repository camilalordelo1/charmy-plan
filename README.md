# Charmy · Calendário editorial

Planejamento de posts para **dezembro de 2026**, inspirado na apresentação da Charmy.

## Arquitetura

Front-end estático organizado em módulos ES, com separação de responsabilidades:

```text
index.html                 Estrutura da página e entrada do site
src/
  main.js                  Inicialização, estado e eventos da aplicação
  data/posts.js            Sugestões iniciais de conteúdo
  services/storage.js      Leitura e gravação no localStorage
  views/post-card.js       Renderização dos cards de posts
  utils/html.js            Escape de texto para renderização segura
  styles/main.css          Estilos e responsividade
scripts/
  build.mjs                Gera a pasta dist a partir do código-fonte
package.json               Comandos do projeto
.openai/hosting.json        Configuração da hospedagem
```

## Abrir localmente com Live Server

1. Abra a pasta do projeto no VS Code.
2. Com a extensão **Live Server** instalada, clique com o botão direito no `index.html` **da raiz**.
3. Selecione **Open with Live Server**.

Edite os arquivos em `src/` e o `index.html` da raiz. Para desenvolver com Live Server, não é necessário Python, Node ou instalar dependências. Módulos JavaScript precisam ser servidos por HTTP; abrir o HTML diretamente por `file://` não funciona.

## Gerar a versão para publicação

Com Node.js 18 ou superior instalado:

```bash
npm run check
npm run build
```

Não é necessário `npm install`: o projeto não usa dependências externas de build. O comando de build copia a entrada e os módulos para `dist/`, que é gerada e ignorada pelo Git. Não edite essa pasta diretamente.

## Funcionalidades e dados

Calendário e lista, banco de ideias, criação/edição/exclusão de posts, filtros por canal e status, busca e importação/exportação JSON. O planejamento inicial contém os seis vídeos de `Roteiros charmy (1).pdf`, com roteiro no briefing e status Ideia. Datas sugeridas: 01/12 (Vibe de Dezembro), 08/12 (1 Peça, 3 Vibes), 10/12 (O Poder do Styling), 12/12 (GRWM: Rolê de Sábado), 17/12 (O Efeito Charmy) e 22/12 (Réveillon). Horário de 18h e Instagram/Reels são sugestões, sem validação por dados de audiência.

Para um navegador com planejamento anterior, use **Adicionar roteiros do PDF**. Esse botão preserva os posts existentes e evita adicionar novamente roteiros identificados pela mesma origem.

Dados são salvos no localStorage do navegador, sem sincronização entre dispositivos. A chave de armazenamento foi preservada nesta reorganização. Para manter os dados ao usar Live Server, mantenha o mesmo endereço e porta; se mudar a origem, exporte o JSON antes e importe depois.

Nenhuma integração publica posts nas redes sociais. O site usa Google Fonts com fontes de fallback.

## Banco de imagens e vídeos

A aba **Banco de imagens/vídeos** lê imagens e vídeos da pasta `img/` na raiz, incluindo subpastas. No Live Server, clique em **Atualizar** após adicionar arquivos. Caso a listagem automática não esteja disponível, use **Selecionar pasta img** (visualização local, sem envio dos arquivos).

Para gerar um índice persistente: `npm run media`. O build também atualiza esse índice e copia `img/` para `dist/img/`. Arquivos novos só entram na hospedagem depois de novo build e publicação. Vídeos dependem de codecs suportados pelo navegador; MP4/H.264 e WebM são recomendados.

## Cronograma do Notion

Os dois CSVs fornecidos contêm os mesmos 13 registros de 01 a 13/12, importados uma única vez. Cada briefing preserva a programação e a linha editorial originais, roteiro, legenda e CTA. O cartão representa a publicação no Instagram; canais adicionais permanecem descritos na programação original. O horário de 18h é sugestão, pois não veio no CSV. Os seis roteiros do PDF foram mantidos como propostas independentes; eventuais temas semelhantes podem ser conciliados na revisão editorial.

Para acrescentar esses registros a um calendário já salvo, clique em **Adicionar posts do Notion**. Essa ação preserva edições existentes e evita reimportar o mesmo registro identificado por sua origem.

Imagens `.heic` e `.heif` também são indexadas e exibidas no filtro Imagens. Quando o navegador não as abre diretamente, o site gera prévias JPEG no navegador com heic2any 0.0.4 (MIT, incluído em `src/vendor`), sem enviar os arquivos a um serviço externo. O original é preservado. Arquivos com codecs incompatíveis exibem um aviso e continuam disponíveis pelo link do original.

As 25 imagens HEIC atuais possuem prévias JPEG pré-geradas em `src/assets/previews`, usadas diretamente na galeria sem conversão no navegador. Os links continuam apontando para os originais. Para novas fotos HEIC, execute `npm run previews` com ImageMagick instalado e suporte HEIC habilitado; envie as prévias e `src/data/media-previews.js` ao GitHub. Sem prévia gerada, a conversão no navegador permanece como alternativa.

## GitHub Pages

O workflow `.github/workflows/pages.yml` verifica o código, gera `dist/` e publica no GitHub Pages a cada push em `main`. Em **Settings → Pages**, selecione **GitHub Actions** como Source. Repositórios privados precisam de um plano GitHub que ofereça Pages para essa visibilidade. Não é necessário versionar `dist/` nem instalar dependências de build.

O conteúdo estático publicado inclui as mídias da pasta `img/`. Dados editados no navegador permanecem no localStorage e não são sincronizados entre visitantes.

## Acesso por senha no Pages

A publicação usa AES-256-GCM com uma chave derivada da senha por PBKDF2-SHA-256 (600 mil iterações, salt e IVs aleatórios). HTML, scripts, dados e mídias são criptografados; somente a tela de desbloqueio, o manifesto e o service worker ficam legíveis na hospedagem. A senha deve existir exclusivamente no segredo de Actions `SITE_PASSWORD` (Settings → Secrets and variables → Actions). O workflow falha sem esse segredo e não publica uma versão desprotegida.

O desbloqueio acontece no navegador por HTTPS. A chave fica na memória do service worker, não no HTML ou localStorage. O navegador pode solicitar novamente a senha ao encerrar o worker. Funciona como um documento criptografado: quem conhece a senha pode copiar o conteúdo desbloqueado. A força da proteção depende da senha escolhida.

**Limite importante:** o repositório público e seu histórico continuam contendo os originais. Isso protege a versão do Pages, não o código ou as mídias disponíveis no GitHub. Dados editados anteriormente no localStorage continuam no navegador. O desenvolvimento local via Live Server permanece sem bloqueio; para gerar a publicação protegida, execute `npm run build` e `npm run protect` com a variável de ambiente `SITE_PASSWORD` definida.

## Uploads e prévias sociais

Os feeds são exibidos em ordem decrescente de data/horário. Stories ficam nos círculos e abrem em um visualizador próprio. Uploads por post são armazenados em IndexedDB neste navegador e associados ao planejamento local; não sincronizam com outros dispositivos nem são incluídos no backup JSON. Use **Salvar na pasta img** para guardar uma cópia. O navegador pede acesso à pasta; sem File System Access, o arquivo é baixado. Para compartilhar a mídia no site, ainda é necessário commit/push e publicação. HEIC enviado pelo formulário é convertido para JPEG quando o conversor suporta o arquivo.

A prévia de TikTok usa controles próprios de reprodução, som e avanço, com ícones vetoriais, abas superiores e navegação inferior de simulação. O padrão é **16:9 horizontal**; o seletor da prévia permite **9:16 vertical**. A proporção da apresentação não modifica nem corta o arquivo original. Curtir/salvar têm efeito apenas na simulação; comentários e compartilhamento são ilustrativos, sem números inventados. No Instagram, a própria foto do perfil abre os Stories filtrados, em ordem decrescente de data/horário. O visualizador de Stories usa 16:9 e informa data e horário no topo.
