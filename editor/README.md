# AnaMed Editor

Interface local para gerenciar os conteúdos do site AnaMed (`../docs/assets`).

## Como usar

**1. Inicie o servidor de assets** (para preview das imagens):
```bash
cd ../docs
python -m http.server 8000
```

**2. Em outro terminal, inicie o editor:**
```bash
cd editor
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Funcionalidades

- Criar e excluir disciplinas e estudos
- Adicionar, editar, reordenar e excluir itens (Grupo, Pergunta, Resposta)
- Upload de imagens diretamente para `docs/assets/<disciplina>/<estudo>/`
- Reordenar e remover imagens de cada item
- Preview das imagens ao editar
- Salvar tudo de volta nos JSONs em `docs/assets/`
