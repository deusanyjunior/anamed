# AnaMed — Estudo & Quiz de Anatomia
Criado por estudantes de Biomedicina e Medicina

Aplicação React/Next.js para estudo e memorização de conteúdos de Anatomia.

## Stack de tecnologias

### Aplicação web e editor

- **Next.js** — framework principal do site público e do editor local, usando App Router e rotas dinâmicas.
  - Site público: `16.3.5`
  - Editor: `16.2.4`
- **React** — construção dos componentes e das interfaces interativas (`19.2.4`).
- **TypeScript** — tipagem do código do site, editor, catálogo e datasets.
- **Node.js e npm** — execução dos projetos, instalação de dependências e scripts de desenvolvimento/build.
- **Tailwind CSS** — estilização da interface do editor.
- **CSS global** — estilos responsivos e componentes visuais do site público.

### Recursos do site público

- **NextAuth.js** — autenticação com Google OAuth e restrição de acesso por domínio institucional.
- **Google Gemini (`@google/genai`)** — inteligência artificial da Aniah, executada exclusivamente no servidor.
- **React Markdown (`react-markdown` + `remark-gfm`)** — renderização das respostas formatadas da Aniah.
- **Upstash Redis** — armazenamento distribuído das quotas de mensagens da Aniah em produção.
- **Vercel** — plataforma de publicação do site público.

### Qualidade e desenvolvimento

- **ESLint** — análise estática e padronização do código.
- **TypeScript compiler** — verificação de tipos durante o build.

## Estrutura do projeto

```
anamed/
├── docs/                         # site público (Next.js)
│   ├── app/
│   │   ├── [tema]/[estudo]/      # rota dinâmica de cada estudo
│   │   ├── assets/[...path]/      # entrega segura de assets
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/               # componentes React client-side
│   ├── lib/                      # tipos e leitura dos JSONs
│   ├── assets/                   # catálogo, datasets e imagens
│   ├── package.json
│   └── next.config.ts
└── editor/                       # editor local independente (Next.js)
```

## Site público (`docs/`)

### Funcionalidades

- **Modo Estudo** — navega pelos itens organizados por grupo, com acordeão e imagens
- **Modo Quiz** — resposta livre com correção automática, normalização de acentos e maiúsculas
- **Erros primeiro** — respostas erradas são reapresentadas automaticamente até duas vezes
- **Refazer apenas erros** — cria um novo quiz somente com os itens errados
- **Filtro por grupo** — seleciona quais grupos incluir no quiz
- **Histórico de sessões** — últimas 50 sessões salvas no `localStorage`
- **Áudios e vídeos** — players de mídia no mesmo nível das imagens
- **Rotas por estudo** — cada valor de `Exercicios` gera uma rota removendo apenas `.json`

Exemplo:

```json
"Exercicios": "ossos/esqueleto-axial/esqueleto-axial.json"
```

gera:

```text
/ossos/esqueleto-axial
```

### Executando localmente

```bash
cd docs
npm install
npm run dev -- -p 8000
```

Acesse [http://localhost:8000](http://localhost:8000).

Para executar a versão de produção:

```bash
cd docs
npm run build
npm run start -- -p 8000
```

### Publicando na Vercel

Configure `docs` como **Root Directory** do projeto na Vercel. Use os comandos padrão do Next.js:

- Install Command: `npm install`
- Build Command: `npm run build`
- Output: padrão do Next.js

Após o deploy, o estudo do exemplo estará disponível em:

```text
https://anamed.vercel.app/ossos/esqueleto-axial
```

### Aniah e variáveis de ambiente

O site inclui a Aniah, uma tutora de anatomia acessível somente a usuários autenticados com uma conta Google verificada no domínio `@unifesp.br`. A chamada ao Gemini ocorre exclusivamente no servidor.

Copie `docs/.env.example` para `docs/.env.local` durante o desenvolvimento e configure as mesmas variáveis em **Vercel → Settings → Environment Variables**. Nunca use `NEXT_PUBLIC_GEMINI_API_KEY`: a chave do Gemini deve permanecer server-side.

No Google Cloud, cadastre estes URIs de redirecionamento:

```text
http://localhost:8000/api/auth/callback/google
https://SEU-DOMINIO.vercel.app/api/auth/callback/google
```

Em produção, configure também `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`. Eles permitem aplicar o limite de 100 mensagens por dia e 10 por minuto por usuário mesmo quando a Vercel distribui as requisições entre várias instâncias. Os valores podem ser ajustados por `ANIAH_DAILY_LIMIT` e `ANIAH_MINUTE_LIMIT`.

## Editor (`editor/`)

O editor é uma aplicação Next.js independente para gerenciar os conteúdos em `docs/assets/` sem editar JSON manualmente.

### Funcionalidades

- Criar e excluir temas e estudos
- Renomear estudos, arquivos JSON e pastas de imagens
- Adicionar, editar, reordenar e excluir itens (Descrição, Item, Grupo)
- Adicionar imagens, áudios e vídeos por upload ou URL
- Reordenar e remover imagens, áudios e vídeos
- Editar títulos e referências de mídia
- Renomear arquivos de imagem em disco
- Editar indicação e dados de copyright por imagem
- Editar capas dos estudos
- Salvar tudo nos JSONs em `docs/assets/`

### Como usar

**1. Inicie o servidor do editor:**

```bash
cd editor
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

O editor continua separado do site público. As duas aplicações compartilham os dados em `docs/assets/`.

## Adicionando conteúdo manualmente

Para adicionar um novo tema ou estudo diretamente nos arquivos:

1. Crie a pasta `docs/assets/<tema>/<estudo>/` e coloque as imagens lá.
2. Crie o dataset `docs/assets/<tema>/<estudo>.json` seguindo o schema:

```json
{
  "schema": "estudos_v1",
  "geradoEm": "2026-05-19",
  "itens": [
    {
      "Grupo": "Nome do grupo",
      "Descricao": "Texto descritivo",
      "Item": "Nome ou identificação do item",
      "Imagens": [
        {
          "url": "assets/<tema>/<estudo>/imagem.png",
          "indicação": "Descrição opcional",
          "Copyright": {
            "licenca": "CC BY-SA 2.1 JP",
            "fonte": "Wikimedia Commons",
            "urlOriginal": "https://...",
            "observacao": "Observação opcional"
          }
        }
      ],
      "Audios": [
        {
          "url": "assets/<tema>/<estudo>/audio.mp3",
          "Titulo": "Título do áudio"
        }
      ],
      "Videos": [
        {
          "url": "assets/<tema>/<estudo>/video.mp4",
          "Titulo": "Título do vídeo",
          "Tipo": "arquivo"
        },
        {
          "url": "https://www.youtube.com/watch?v=VIDEO_ID",
          "Titulo": "Vídeo do YouTube",
          "Tipo": "youtube"
        }
      ]
    }
  ]
}
```

O estudo de áudio foi dividido em dois datasets: `docs/assets/ossos/cingulo/cingulo.json`, com os grupos Clavícula e Escápula, e `docs/assets/ossos/membro-superior/membro-superior.json`, com os grupos Mão, Rádio, Ulna e Úmero. Os arquivos de áudio ficam nas respectivas subpastas `audios/`, e a transcrição opcional deve ser colocada em `Transcricao`, dentro do objeto correspondente em `Audios`.


```json
{
  "Tema": "Nome do Tema",
  "Estudos": [
    {
      "Titulo": "Nome do estudo",
      "Exercicios": "<tema>/<estudo>.json",
      "Imagem": [
        {
          "url": "assets/<tema>/<estudo>/imagens/capa.png",
          "Copyright": {
            "licenca": "CC BY-SA 2.1 JP",
            "fonte": "Wikimedia Commons",
            "urlOriginal": "https://...",
            "observacao": "Observação opcional"
          }
        }
      ]
    }
  ]
}
```

O Next.js usará automaticamente o caminho de `Exercicios`, removendo somente a extensão `.json`, para gerar a rota do estudo.

## Licença das imagens

Imagens provenientes do projeto [BodyParts3D / Anatomography](https://dbcls.rois.ac.jp/) e do [Wikimedia Commons](https://commons.wikimedia.org). Consulte o campo `Copyright` de cada item no dataset para requisitos de atribuição específicos.

## Créditos

Anatomia Inclusiva - Unifesp
