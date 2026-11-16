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

Calendário e lista, banco de ideias, criação/edição/exclusão de posts, filtros por canal e status, busca e importação/exportação JSON. As 15 sugestões iniciais são rascunhos com status Ideia.

Dados são salvos no localStorage do navegador, sem sincronização entre dispositivos. A chave de armazenamento foi preservada nesta reorganização. Para manter os dados ao usar Live Server, mantenha o mesmo endereço e porta; se mudar a origem, exporte o JSON antes e importe depois.

Nenhuma integração publica posts nas redes sociais. O site usa Google Fonts com fontes de fallback.
