export type CopyrightInfo = {
  licenca: string;
  fonte: string;
  observacao?: string;
};

export type BoneItem = {
  Grupo: string;
  Osso: string;
  Imagens: [string, string];
  Copyright: CopyrightInfo;
};

export type BonesDataset = {
  schema?: string;
  geradoEm?: string;
  itens: BoneItem[];
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
