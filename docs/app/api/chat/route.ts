import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { getServerSession } from 'next-auth';
import { authOptions, isAllowedUnifespEmail } from '../../../auth';
import { consumeAniahQuota } from '../../../lib/chat-limit';

export const runtime = 'nodejs';

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_TOTAL_LENGTH = 12000;

const instructions = `Você é Aniah, uma tutora virtual do projeto AnaMed, voltado ao estudo de anatomia.
Responda em português brasileiro, com clareza e linguagem adequada para estudantes.
Ajude a compreender conceitos, revisar conteúdos e criar perguntas de estudo.
Não invente informações nem diga que consultou materiais que não recebeu.
Quando não tiver segurança, diga que não há informação suficiente e recomende consultar o professor ou uma fonte acadêmica.
Você não substitui avaliação, diagnóstico ou orientação médica profissional.
Se a pergunta não tiver relação com estudo, anatomia ou uso do AnaMed, responda brevemente que seu foco é apoiar os estudos de anatomia.`;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function isValidMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return false;
  return value.every(message => (
    typeof message === 'object' && message !== null &&
    ((message as ChatMessage).role === 'user' || (message as ChatMessage).role === 'assistant') &&
    typeof (message as ChatMessage).content === 'string' &&
    (message as ChatMessage).content.trim().length > 0 &&
    (message as ChatMessage).content.length <= MAX_MESSAGE_LENGTH
  ));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) return Response.json({ error: 'Faça login para conversar com a Aniah.' }, { status: 401 });
  if (!isAllowedUnifespEmail(email)) return Response.json({ error: 'O acesso à Aniah está disponível somente para emails @unifesp.br.' }, { status: 403 });
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'O serviço da Aniah ainda não foi configurado.' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const messages = body && typeof body === 'object' && 'messages' in body ? body.messages : undefined;
  if (!isValidMessages(messages)) return Response.json({ error: 'Envie uma conversa válida.' }, { status: 400 });
  if (messages.reduce((total, message) => total + message.content.length, 0) > MAX_TOTAL_LENGTH) {
    return Response.json({ error: 'A conversa enviada é muito longa.' }, { status: 413 });
  }

  const quota = await consumeAniahQuota(email);
  if (quota.configurationError) return Response.json({ error: 'O controle de uso da Aniah ainda não foi configurado.' }, { status: 503 });
  if (!quota.allowed) return Response.json({ error: 'Você atingiu o limite temporário de uso. Tente novamente mais tarde.', dailyRemaining: quota.dailyRemaining }, { status: 429 });

  const conversation = messages.map(message => `${message.role === 'user' ? 'Estudante' : 'Aniah'}: ${message.content}`).join('\n\n');

  try {
    const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const thinkingConfig = model.toLowerCase().startsWith('gemini-3')
      ? { thinkingLevel: ThinkingLevel.MINIMAL }
      : { thinkingBudget: 0 };
    const response = await gemini.models.generateContent({
      model,
      contents: conversation,
      config: {
        systemInstruction: instructions,
        maxOutputTokens: 2000,
        thinkingConfig,
      },
    });
    const answer = response.text?.trim();
    if (!answer) throw new Error('Gemini não retornou texto');
    return Response.json({ answer, dailyRemaining: quota.dailyRemaining });
  } catch (error) {
    console.error('Erro ao consultar Gemini:', error instanceof Error ? error.message : 'erro desconhecido');
    return Response.json({ error: 'Não foi possível obter uma resposta agora. Tente novamente.' }, { status: 502 });
  }
}
