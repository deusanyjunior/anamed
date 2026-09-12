# AnaMed — Estudo & Quiz de Anatomia
Criado por estudantes de Biomedicina e Medicina

Aplicação React/Next.js para estudo e memorização de conteúdos de Anatomia.

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
/ossos/esqueleto-axial-axial
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
https://anamed.vercel.app/ossos/esqueleto-axial-axial
```

## Editor (`editor/`)

O editor é uma aplicação Next.js independente para gerenciar os conteúdos em `docs/assets/` sem editar JSON manualmente.

### Funcionalidades

- Criar e excluir temas e estudos
- Renomear estudos, arquivos JSON e pastas de imagens
- Adicionar, editar, reordenar e excluir itens (Pergunta, Resposta, Grupo)
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
      "Pergunta": "Texto da pergunta",
      "Resposta": "Texto da resposta",
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
          "url": "assets/<tema>/<estudo>/capa.png",
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
