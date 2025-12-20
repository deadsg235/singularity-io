const pickEnv = (
  keys: string[],
  fallback: string,
): string => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return fallback;
};

const normalizeTranscriptionModel = (value: string): string => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return 'gpt-4o-transcribe';
  if (trimmed === 'gpt-4o-transcribe-latest') return 'gpt-4o-transcribe';
  return trimmed;
};

export const MODEL_IDS = {
  general: pickEnv(
    ['NEXT_PUBLIC_OPENAI_GENERAL_MODEL', 'OPENAI_GENERAL_MODEL'],
    'gpt-5',
  ),
  realtime: pickEnv(
    ['NEXT_PUBLIC_OPENAI_REALTIME_MODEL', 'OPENAI_REALTIME_MODEL'],
    'gpt-realtime',
  ),
  transcription: normalizeTranscriptionModel(
    pickEnv(
      ['NEXT_PUBLIC_OPENAI_TRANSCRIPTION_MODEL', 'OPENAI_TRANSCRIPTION_MODEL'],
      'gpt-4o-transcribe',
    ),
  ),
  supervisor: pickEnv(
    ['NEXT_PUBLIC_OPENAI_SUPERVISOR_MODEL', 'OPENAI_SUPERVISOR_MODEL'],
    'gpt-5',
  ),
  guardrail: pickEnv(
    ['NEXT_PUBLIC_OPENAI_GUARDRAIL_MODEL', 'OPENAI_GUARDRAIL_MODEL'],
    'gpt-5-mini',
  ),
  reasoningFast: pickEnv(
    ['NEXT_PUBLIC_OPENAI_REASONING_FAST_MODEL', 'OPENAI_REASONING_FAST_MODEL'],
    'o4-mini',
  ),
  reasoningPro: pickEnv(
    ['NEXT_PUBLIC_OPENAI_REASONING_PRO_MODEL', 'OPENAI_REASONING_PRO_MODEL'],
    'o3-pro',
  ),
  deepResearch: pickEnv(
    ['NEXT_PUBLIC_OPENAI_DEEP_RESEARCH_MODEL', 'OPENAI_DEEP_RESEARCH_MODEL'],
    'o3-deep-research',
  ),
  writing: pickEnv(
    ['NEXT_PUBLIC_OPENAI_WRITING_MODEL', 'OPENAI_WRITING_MODEL'],
    'gpt-4.5',
  ),
  chattyCathy: pickEnv(
    ['NEXT_PUBLIC_OPENAI_CHATTY_CATHY_MODEL', 'OPENAI_CHATTY_CATHY_MODEL'],
    'gpt-5-chat-latest',
  ),
  imageGeneration: pickEnv(
    ['NEXT_PUBLIC_OPENAI_IMAGE_GENERATION_MODEL', 'OPENAI_IMAGE_GENERATION_MODEL'],
    'GPT-image-1',
  ),
  audio: pickEnv(
    ['NEXT_PUBLIC_OPENAI_AUDIO_MODEL', 'OPENAI_AUDIO_MODEL'],
    'gpt-audio',
  ),
} as const;

export type ModelKey = keyof typeof MODEL_IDS;

export const getModelId = (key: ModelKey): string => MODEL_IDS[key];
