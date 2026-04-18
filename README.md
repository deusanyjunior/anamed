# AnaMed — Estudo & Quiz de Anatomia

Aplicação para estudo e memorização de conteúdos de Anatomia, Histologia e Embriologia, publicada via GitHub Pages.

## Estrutura do projeto

```
anamed/
├── docs/                         # site estático (GitHub Pages)
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── _config.yml
│   └── assets/
│       ├── estudos.json          # catálogo de disciplinas e estudos
│       ├── anatomia/
│       │   ├── ossos.json        # dataset de perguntas/respostas
│       │   └── ossos/            # imagens
│       ├── histologia/
│       │   ├── epitelial.json
│       │   ├── conjuntivo.json
│       │   ├── epitelial/
│       │   └── conjuntivo/
│       └── embriologia/
│           ├── fases.json
│           └── fases/
└── editor/                       # editor local (Next.js)
    └── app/
```

---

## Site (docs/)

### Funcionalidades

- **Modo Estudo** — navega pelos itens organizados por grupo, com acordeão e imagens
- **Modo Quiz** — resposta livre com correção automática (normalização de acentos e maiúsculas)
- **Erros primeiro** — respostas erradas são reapresentadas automaticamente (até 2 vezes por item)
- **Refazer apenas erros** — ao final, botão para criar um novo quiz só com os itens errados
- **Filtro por grupo** — selecione quais grupos incluir no quiz
- **Histórico de sessões** — últimas 50 sessões salvas no `localStorage`
- **Persistência de configurações** — grupos selecionados são lembrados entre sessões

### Testando localmente

```bash
cd docs
python -m http.server 8000
```

Acesse [http://localhost:8000](http://localhost:8000).

### Publicando no GitHub Pages

1. Faça push do repositório para o GitHub
2. Vá em **Settings → Pages**
3. Source: **Deploy from a branch**, branch `main`, pasta `/docs`
4. O site ficará disponível em `https://<usuario>.github.io/<repositorio>/`

---

## Editor (editor/)

Interface local para gerenciar os conteúdos em `docs/assets/` sem editar JSON manualmente.

### Funcionalidades

- Criar e excluir disciplinas e estudos
- Renomear estudos (renomeia o arquivo JSON e a pasta de imagens automaticamente)
- Adicionar, editar, reordenar e excluir itens (Pergunta, Resposta, Grupo)
- Adicionar imagens por **upload de arquivo** ou por **URL** (baixa e salva localmente)
- Reordenar e remover imagens de cada item
- Renomear arquivos de imagem em disco diretamente pelo editor
- Editar **indicação** e dados de **copyright** (licença, fonte, URL original, observação) por imagem
- Editar imagem de capa de cada estudo, com upload, adição por URL, renomear e copyright
- Preview das imagens ao editar
- Salvar tudo de volta nos JSONs em `docs/assets/`

### Como usar

**1. Inicie o servidor de assets** (para preview das imagens):
```bash
cd docs
python -m http.server 8000
```

**2. Em outro terminal, inicie o editor:**
```bash
cd editor
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Adicionando conteúdo manualmente

Para adicionar uma nova disciplina ou estudo diretamente nos arquivos:

1. Crie a pasta `docs/assets/<disciplina>/<estudo>/` e coloque as imagens lá
2. Crie o dataset `docs/assets/<disciplina>/<estudo>.json` seguindo o schema:

```json
{
  "itens": [
    {
      "Grupo": "Nome do grupo",
      "Pergunta": "Texto da pergunta",
      "Resposta": "Texto da resposta",
      "Imagens": [
        {
          "url": "assets/<disciplina>/<estudo>/imagem.png",
          "indicação": "Descrição opcional",
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

3. Registre o novo estudo em `docs/assets/estudos.json`:

```json
{
  "Disciplina": "Nome da Disciplina",
  "Estudos": [
    {
      "Titulo": "Nome do estudo",
      "Exercicios": "<disciplina>/<estudo>.json",
      "Imagem": [
        {
          "url": "assets/<disciplina>/<estudo>/capa.png",
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

---

## Licença das imagens

Imagens provenientes do projeto [BodyParts3D / Anatomography](https://dbcls.rois.ac.jp/) e do [Wikimedia Commons](https://commons.wikimedia.org). Consulte o campo `Copyright` de cada item no dataset para requisitos de atribuição específicos.

# Créditos

Turma 94 da EPM - Unifesp