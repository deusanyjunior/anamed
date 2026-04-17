# AnaMed — Estudo & Quiz de Anatomia

Aplicação web estática para estudo e memorização de conteúdos de Anatomia, Histologia e Embriologia, publicada via GitHub Pages.

## Funcionalidades

- **Modo Estudo** — navega pelos itens organizados por grupo, com acordeão e imagens
- **Modo Quiz** — resposta livre com correção automática (normalização de acentos e maiúsculas)
- **Erros primeiro** — respostas erradas são reapresentadas automaticamente (até 2 vezes por item)
- **Refazer apenas erros** — ao final, botão para criar um novo quiz só com os itens errados
- **Filtro por grupo** — selecione quais grupos incluir no quiz
- **Histórico de sessões** — últimas 50 sessões salvas no `localStorage` com data, acurácia e grupos utilizados
- **Persistência de configurações** — grupos selecionados são lembrados entre sessões

## Estrutura do projeto

```
docs/
├── index.html
├── app.js
├── style.css
├── _config.yml
└── assets/
    ├── estudos.json              # catálogo de disciplinas e estudos
    ├── anatomia/
    │   ├── ossos.json            # dataset de perguntas/respostas
    │   └── ossos/                # imagens
    ├── histologia/
    │   ├── epitelial.json
    │   ├── conjuntivo.json
    │   ├── epitelial/
    │   └── conjuntivo/
    └── embriologia/
        ├── fases.json
        └── fases/
```

## Testando localmente

```bash
cd docs
python -m http.server 8000
```

Acesse [http://localhost:8000](http://localhost:8000).

## Adicionando conteúdo

Para adicionar uma nova disciplina ou estudo:

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
          "indicação": "Descrição opcional"
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
      "Imagem": "assets/<disciplina>/<estudo>/capa.png"
    }
  ]
}
```

## Publicando no GitHub Pages

1. Faça push do repositório para o GitHub
2. Vá em **Settings → Pages**
3. Source: **Deploy from a branch**, branch `main`, pasta `/docs`
4. O site ficará disponível em `https://<usuario>.github.io/<repositorio>/`

## Licença das imagens

Imagens provenientes do projeto [BodyParts3D / Anatomography](https://dbcls.rois.ac.jp/) e do [Wikimedia Commons](https://commons.wikimedia.org). Consulte o campo `Copyright` de cada item no dataset para requisitos de atribuição específicos.

## Créditos

- Agentes de IA: Microsoft Copilot, Cursor, Amazon Q
- Idealizadores: Estudantes da Turma 94 da EPM
- Inspiração: Ana e Med EPM
