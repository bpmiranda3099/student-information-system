import { GoogleGenAI, ThinkingLevel, type GenerateContentConfig } from '@google/genai';

const DEFAULT_MODEL = 'gemini-3.5-flash';

let client: GoogleGenAI | null = null;

function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return apiKey;
}

function getModelId(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return client;
}

function defaultThinkingConfig(level: ThinkingLevel = ThinkingLevel.MEDIUM): GenerateContentConfig {
  return {
    thinkingConfig: {
      thinkingLevel: level,
    },
  };
}

export async function generateText(params: {
  contents: string;
  model?: string;
  config?: GenerateContentConfig;
}): Promise<string> {
  const response = await getClient().models.generateContent({
    model: params.model ?? getModelId(),
    contents: params.contents,
    config: params.config ?? defaultThinkingConfig(),
  });

  const text = response.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

export async function generateTextStream(params: {
  contents: string;
  model?: string;
  config?: GenerateContentConfig;
}) {
  return getClient().models.generateContentStream({
    model: params.model ?? getModelId(),
    contents: params.contents,
    config: params.config ?? defaultThinkingConfig(),
  });
}

export async function createChat(params?: {
  model?: string;
  config?: GenerateContentConfig;
}) {
  return getClient().chats.create({
    model: params?.model ?? getModelId(),
    config: params?.config ?? defaultThinkingConfig(),
  });
}

export async function generateTailoredLesson(params: {
  lessonTitle: string;
  lessonTopics: string[];
  weakTopics: string[];
  syllabusContext?: string;
  pdfText?: string;
}): Promise<string> {
  const prompt = `A student needs a focused review lesson.

Lesson: ${params.lessonTitle}
Lesson topics: ${params.lessonTopics.join(', ')}
Student weak areas (from grade analysis): ${params.weakTopics.join(', ') || 'general review needed'}
${params.syllabusContext ? `\nSyllabus context:\n${params.syllabusContext}` : ''}
${params.pdfText ? `\nOriginal lesson content (excerpt):\n${params.pdfText.slice(0, 8000)}` : ''}

Create a tailored study guide that:
1. Focuses primarily on the student's weak areas
2. Provides clear explanations with examples
3. Includes practice questions for weak topics
4. References relevant syllabus objectives
5. Is structured with headings and bullet points

Keep the response concise but thorough (800-1200 words).`;

  return generateText({
    contents: prompt,
    config: {
      systemInstruction:
        'You are an academic tutor who creates personalized study guides for college students.',
      ...defaultThinkingConfig(ThinkingLevel.MEDIUM),
    },
  });
}

export async function checkGeminiHealth(): Promise<{ status: string; model?: string }> {
  try {
    if (!isGeminiConfigured()) return { status: 'not_configured' };
    getClient();
    return { status: 'ok', model: getModelId() };
  } catch {
    return { status: 'error' };
  }
}
