export type CopyrightInfo = {
  licenca?: string;
  fonte?: string;
  urlOriginal?: string;
  observacao?: string;
};

export type StudyImage = {
  url: string;
  indicação?: string;
  Copyright?: CopyrightInfo;
};

export type StudyAudio = {
  id?: string;
  url: string;
  Titulo?: string;
  Transcricao?: string;
  Copyright?: CopyrightInfo;
};

export type StudyVideo = {
  url: string;
  Titulo?: string;
  Tipo?: 'arquivo' | 'youtube';
  Copyright?: CopyrightInfo;
};

export type StudyItem = {
  id?: string;
  Grupo: string;
  Pergunta: string;
  Resposta: string;
  Imagens: StudyImage[];
  Audios?: StudyAudio[];
  Videos?: StudyVideo[];
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

export type Tema = {
  Tema: string;
  Estudos: EstudoRef[];
};

export type EstudosCatalog = {
  schema?: string;
  itens: Tema[];
};
