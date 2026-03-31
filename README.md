# AnaMed — Estudo & Quiz de Anatomia

Aplicação web para estudo e memorização dos ossos do esqueleto humano, desenvolvida com Next.js 14 e TypeScript.

## Funcionalidades

- **Modo Estudo** — navega pelos ossos organizados por grupo, com duas imagens por osso (Wikimedia Commons / Anatomography)
- **Modo Quiz** — resposta livre com correção automática (normalização de acentos e maiúsculas)
- **Erros primeiro** — respostas erradas entram numa fila e são reapresentadas automaticamente (até 2 vezes por item)
- **Refazer apenas erros** — ao final, botão para criar um novo quiz só com os itens errados
- **Filtro por grupo** — selecione quais grupos de ossos incluir no quiz (Crânio, Coluna, Tórax, Membros…)
- **Histórico de sessões** — últimas 50 sessões salvas no `localStorage` com data, acurácia e grupos utilizados
- **Persistência de configurações** — grupos selecionados são lembrados entre sessões

## Estrutura do projeto

```
src/
├── app/
│   ├── layout.tsx       # Layout raiz (Next.js App Router)
│   ├── page.tsx         # Página principal — orquestra abas e views
│   └── globals.css      # Estilos globais
├── components/
│   ├── StudyView.tsx    # Modo estudo (acordeão por grupo, lazy render)
│   ├── QuizView.tsx     # Modo quiz (setup → pergunta → reveal → done)
│   ├── Tabs.tsx         # Componente de abas (Estudo / Quiz)
│   └── utils.ts         # normalizeAnswer, shuffle, groupBy, uid, formatDateTime
├── data/
│   └── bones.json       # Dataset de ossos
└── types.ts             # Tipos TypeScript (BoneItem, BonesDataset, QuizSession)
```

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Dataset

`src/data/bones.json` — lista de ossos com grupos, imagens e informações de copyright.

```json
{
  "itens": [
    {
      "Grupo": "Crânio > Neurocrânio",
      "Osso": "Frontal",
      "Imagens": ["url_anterior", "url_lateral"],
      "Copyright": { "licenca": "CC BY-SA 2.1 JP", "fonte": "BodyParts3D / Anatomography (DBCLS)" }
    }
  ]
}
```

Imagens hospedadas no [Wikimedia Commons](https://commons.wikimedia.org) via `Special:FilePath/`.

## Tecnologias

| Tecnologia | Versão |
|---|---|
| Next.js | 14 |
| React | 18 |
| TypeScript | 5 |

## Licença das imagens

Imagens do dataset provenientes do projeto [BodyParts3D / Anatomography](https://dbcls.rois.ac.jp/), licença **CC BY-SA 2.1 JP**. Consulte a página de cada arquivo no Wikimedia Commons para requisitos de atribuição específicos.
