export type CopyrightInfo = {
  licenca: string;
  fonte: string;
  observacao?: string;
};

export type StudyItem = {
  Grupo: string;
  Pergunta: string;
  Resposta: string;
  Imagens: Array<{
    url: string;
    indicação?: string;
    Copyright?: CopyrightInfo;
  }>;
};

export type StudyDataset = {
  schema?: string;
  geradoEm?: string;
  itens: StudyItem[];
};

export type EstudoImagemItem = {
  url: string;
  Copyright?: CopyrightInfo;
};

export type EstudoRef = {
  Titulo: string;
  Exercicios: string;
  Imagem?: string | EstudoImagemItem[];
  Copyright?: CopyrightInfo;
};

export type Disciplina = {
  Disciplina: string;
  Estudos: EstudoRef[];
};

export type EstudosCatalog = {
  schema?: string;
  itens: Disciplina[];
};

export type QuizSession = {
  id: string;
  startedAt: string;
  finishedAt: string;
  grupos: string[];
  total: number;
  respondidas: number;
  corretas: number;
  acuracia: number;
  erros: number;
};
