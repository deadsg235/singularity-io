const API_ORIGIN = process.env.NEXT_PUBLIC_DEXTER_API_ORIGIN?.replace(/\/$/, '');

export class PromptModuleError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, status: number, details?: unknown, message?: string) {
    super(message || code || 'PromptModuleError');
    this.name = 'PromptModuleError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type PromptModuleUser = {
  id: string;
  email: string | null;
};

export type PromptModule = {
  id: string | null;
  slug: string;
  title: string | null;
  segment: string;
  version: number;
  checksum: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  updatedBy: PromptModuleUser | null;
};

export type PromptModuleRevision = {
  id: string;
  slug: string;
  title: string | null;
  segment: string;
  version: number;
  checksum: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedBy: PromptModuleUser | null;
};

type RequestOptions = {
  method?: string;
  body?: Record<string, unknown> | null;
  accessToken?: string | null;
  signal?: AbortSignal;
};

type PromptResponse<T> = {
  ok: boolean;
  [key: string]: any;
} & T;

const cache = new Map<string, PromptModule>();

function requireApiOrigin(): string {
  if (!API_ORIGIN) {
    throw new Error('NEXT_PUBLIC_DEXTER_API_ORIGIN is not configured.');
  }
  return API_ORIGIN;
}

async function requestPromptApi<T = any>(path: string, options: RequestOptions = {}): Promise<PromptResponse<T>> {
  const origin = requireApiOrigin();
  const url = `${origin}${path}`;
  const headers = new Headers();
  headers.set('Accept', 'application/json');

  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body ?? {});
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    credentials: 'include',
    cache: 'no-store',
    signal: options.signal,
    headers,
    body,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok || !payload) {
    const code = payload?.error || 'unknown_error';
    const message = payload?.message || `Prompt API request failed (${response.status})`;
    throw new PromptModuleError(code, response.status, payload, message);
  }

  return payload as PromptResponse<T>;
}

function normalizeUser(input: any): PromptModuleUser | null {
  if (!input || typeof input !== 'object') return null;
  const id = typeof input.id === 'string' && input.id.trim() ? input.id : null;
  if (!id) return null;
  const email = typeof input.email === 'string' && input.email.trim() ? input.email : null;
  return { id, email };
}

function normalizePromptModule(input: any, fallbackSlug: string): PromptModule {
  const slugValue = typeof input?.slug === 'string' && input.slug.trim() ? input.slug.trim() : fallbackSlug;
  if (!slugValue) {
    throw new Error('Prompt module payload missing slug.');
  }
  const segment = typeof input?.segment === 'string' ? input.segment : '';
  if (!segment) {
    throw new Error(`Prompt module "${slugValue}" is missing segment text.`);
  }
  return {
    id: typeof input?.id === 'string' ? input.id : null,
    slug: slugValue,
    title: typeof input?.title === 'string' && input.title.length ? input.title : null,
    segment,
    version: Number.isFinite(Number(input?.version)) ? Number(input.version) : 0,
    checksum: typeof input?.checksum === 'string' && input.checksum.length ? input.checksum : null,
    createdAt: typeof input?.createdAt === 'string' ? input.createdAt : null,
    updatedAt: typeof input?.updatedAt === 'string' ? input.updatedAt : null,
    updatedBy: normalizeUser(input?.updatedBy ?? input?.updated_by),
  };
}

function normalizeRevision(input: any): PromptModuleRevision {
  const slugValue = typeof input?.slug === 'string' && input.slug.trim() ? input.slug.trim() : '';
  const segment = typeof input?.segment === 'string' ? input.segment : '';
  const fallbackId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  const id = typeof input?.id === 'string' ? input.id : fallbackId;
  return {
    id,
    slug: slugValue,
    title: typeof input?.title === 'string' && input.title.length ? input.title : null,
    segment,
    version: Number.isFinite(Number(input?.version)) ? Number(input.version) : 0,
    checksum: typeof input?.checksum === 'string' && input.checksum.length ? input.checksum : null,
    notes: typeof input?.notes === 'string' && input.notes.trim().length ? input.notes : null,
    createdAt: typeof input?.createdAt === 'string' ? input.createdAt : null,
    updatedBy: normalizeUser(input?.updatedBy ?? input?.updated_by),
  };
}

export async function fetchPromptModule(
  slug: string,
  options: { accessToken?: string | null; signal?: AbortSignal } = {},
): Promise<PromptModule> {
  const trimmed = slug.trim();
  if (!trimmed) {
    throw new Error('Prompt module slug is required.');
  }
  if (cache.has(trimmed)) {
    return cache.get(trimmed)!;
  }

  const data = await requestPromptApi<{ prompt?: any }>(`/prompt-modules/${encodeURIComponent(trimmed)}`, {
    accessToken: options.accessToken ?? null,
    signal: options.signal,
  });
  const raw = data?.prompt;
  if (!data?.ok || !raw) {
    throw new Error(`Prompt module response invalid for slug: ${trimmed}`);
  }

  const prompt = normalizePromptModule(raw, trimmed);
  cache.set(trimmed, prompt);
  return prompt;
}

export async function listPromptModules(options: { accessToken?: string | null; signal?: AbortSignal } = {}): Promise<PromptModule[]> {
  const data = await requestPromptApi<{ prompts?: any[] }>(`/prompt-modules`, {
    accessToken: options.accessToken ?? null,
    signal: options.signal,
  });

  if (!data?.ok || !Array.isArray(data.prompts)) {
    throw new Error('Prompt module list response invalid.');
  }

  const modules = data.prompts.map((entry: any) => normalizePromptModule(entry, entry?.slug ?? ''));
  for (const mod of modules) {
    cache.set(mod.slug, mod);
  }

  return modules;
}

export async function fetchPromptModuleHistory(slug: string, options: { accessToken?: string | null; signal?: AbortSignal } = {}): Promise<PromptModuleRevision[]> {
  const trimmed = slug.trim();
  if (!trimmed) {
    throw new Error('Prompt module slug is required.');
  }

  const data = await requestPromptApi<{ history?: any[] }>(`/prompt-modules/${encodeURIComponent(trimmed)}/history`, {
    accessToken: options.accessToken ?? null,
    signal: options.signal,
  });

  if (!data?.ok || !Array.isArray(data.history)) {
    throw new Error('Prompt module history response invalid.');
  }

  return data.history.map((entry: any) => normalizeRevision(entry));
}

export async function updatePromptModule(params: {
  slug: string;
  segment: string;
  title?: string | null;
  version: number;
  notes?: string | null;
  accessToken?: string | null;
}): Promise<PromptModule> {
  const slug = params.slug.trim();
  if (!slug) {
    throw new Error('Prompt module slug is required.');
  }

  const payload: Record<string, unknown> = {
    segment: params.segment,
    title: params.title ?? null,
    version: params.version,
  };
  if (params.notes) {
    payload.notes = params.notes;
  }

  const data = await requestPromptApi<{ prompt?: any }>(`/prompt-modules/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: payload,
    accessToken: params.accessToken ?? null,
  });

  if (!data?.ok || !data.prompt) {
    throw new Error('Prompt module update response invalid.');
  }

  const prompt = normalizePromptModule(data.prompt, slug);
  cache.set(slug, prompt);
  return prompt;
}

export async function createPromptModule(params: {
  slug: string;
  segment: string;
  title?: string | null;
  notes?: string | null;
  accessToken?: string | null;
}): Promise<PromptModule> {
  const slug = params.slug.trim();
  if (!slug) {
    throw new Error('Prompt module slug is required.');
  }

  const payload: Record<string, unknown> = {
    slug,
    segment: params.segment,
    title: params.title ?? null,
  };
  if (params.notes) {
    payload.notes = params.notes;
  }

  const data = await requestPromptApi<{ prompt?: any }>(`/prompt-modules`, {
    method: 'POST',
    body: payload,
    accessToken: params.accessToken ?? null,
  });

  if (!data?.ok || !data.prompt) {
    throw new Error('Prompt module create response invalid.');
  }

  const prompt = normalizePromptModule(data.prompt, slug);
  cache.set(slug, prompt);
  return prompt;
}

export function clearPromptModuleCache() {
  cache.clear();
}
