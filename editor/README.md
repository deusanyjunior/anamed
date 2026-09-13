# AnaMed Editor

Aplicação local para gerenciar os conteúdos do site AnaMed armazenados em `../docs/assets`. O editor é uma aplicação Next.js independente e altera os arquivos do projeto diretamente; não é necessário editar os JSONs manualmente.

## Pré-requisitos

- Node.js e npm instalados
- Dependências instaladas nos projetos `editor` e `docs`

## Como executar

A partir da raiz do repositório, instale as dependências uma vez:

```bash
cd docs
npm install
cd ../editor
npm install
```

Para permitir o preview dos assets, inicie o site em outro terminal:

```bash
cd docs
npm run dev -- -p 8000
```

Em outro terminal, inicie o editor:

```bash
cd editor
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

O site em `http://localhost:8000` é usado para visualizar as imagens, os áudios e os vídeos existentes em `docs/assets`. O editor e o site público continuam sendo aplicações separadas.

Para gerar e executar a versão de produção do editor:

```bash
cd editor
npm run build
npm run start
```

## Funcionalidades

- Criar e excluir temas e estudos
- Editar o título visual dos estudos
- Definir e alterar a rota pública de cada estudo
- Criar, editar, reordenar e excluir itens de estudo (Grupo, Descrição e Item)
- Adicionar, editar, reordenar e remover imagens, áudios e vídeos
- Fazer upload de imagens, áudios e vídeos diretamente para os diretórios de assets
- Adicionar mídias por URL quando aplicável
- Editar títulos, transcrições, identificadores e referências das mídias
- Editar indicação e informações de copyright das imagens
- Editar capas dos estudos
- Visualizar imagens e reproduzir áudios e vídeos durante a edição
- Salvar as alterações nos arquivos JSON de `docs/assets/`

## Título, rota e dataset

Cada estudo possui três informações com funções diferentes:

- **`Titulo`**: nome visual exibido no catálogo e nas páginas. Alterá-lo não deve mover nem renomear os arquivos do estudo.
- **`Rota`**: endereço público do estudo, sem `.json`, normalmente no formato `tema/estudo`. Pode ser alterada no campo **Rota pública**.
- **`Exercicios`**: caminho do dataset físico, incluindo o arquivo `.json`. Esse caminho identifica os dados que o editor deve carregar.

Exemplo:

```json
{
  "Titulo": "Esqueleto axial",
  "Rota": "ossos/esqueleto-axial",
  "Exercicios": "ossos/esqueleto-axial/esqueleto-axial.json"
}
```

A rota pública pode ser alterada sem renomear o dataset ou mover suas imagens, áudios e vídeos. O editor rejeita rotas inválidas, com menos de dois segmentos, barras no início ou no fim, `..` ou extensão `.json`, e também impede conflitos entre estudos.

Para manter compatibilidade com estudos antigos, quando `Rota` não estiver preenchida o sistema deriva a rota a partir de `Exercicios`.

## Localização dos arquivos

Os datasets ficam no caminho definido por `Exercicios`, por exemplo:

```text
docs/assets/ossos/esqueleto-axial/esqueleto-axial.json
```

Os assets associados ficam normalmente em:

```text
docs/assets/<tema>/<estudo>/
├── imagens/
├── audios/
└── arquivos de vídeo
```

Os uploads de imagens são gravados na pasta `imagens/` do estudo, os uploads de áudio na pasta `audios/` e os vídeos no diretório do estudo. As referências correspondentes são atualizadas no JSON.

## Validação

Antes de publicar alterações, execute os comandos abaixo em cada aplicação:

```bash
cd docs
npm run lint
npm run build

cd ../editor
npm run lint
npm run build
```

O editor deve ser utilizado localmente e com cuidado, pois suas operações de salvamento e upload alteram os arquivos compartilhados em `docs/assets/`.
