import { afterEach, describe, expect, it, vi } from 'vitest';
import { reiniciarEnvParaTests } from '@/lib/env';
import { cadenaDeModelos, esperaPorLimite } from './modelos';

function conEnv(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  reiniciarEnvParaTests();
}

afterEach(() => {
  vi.unstubAllEnvs();
  reiniciarEnvParaTests();
});

const BASE = {
  GROQ_API_KEY: 'gsk_prueba',
  GOOGLE_GENERATIVE_AI_API_KEY: 'g_prueba',
  ANTHROPIC_API_KEY: '',
  MODEL_PEPE: 'groq:openai/gpt-oss-20b',
  MODEL_JUEZ: 'groq:openai/gpt-oss-120b',
  MODEL_RESPALDO: 'google:gemini-x, anthropic:claude-x',
};

describe('cadenaDeModelos', () => {
  it('el Juez puede usar todos los modelos, empezando por el suyo', () => {
    conEnv(BASE);
    expect(cadenaDeModelos('juez')).toEqual(['groq:openai/gpt-oss-120b', 'groq:openai/gpt-oss-20b', 'google:gemini-x']);
  });

  it('Pepe nunca le gasta el cupo al modelo del Juez', () => {
    conEnv(BASE);
    const cadena = cadenaDeModelos('pepe');
    expect(cadena).toEqual(['groq:openai/gpt-oss-20b', 'google:gemini-x']);
    expect(cadena).not.toContain('groq:openai/gpt-oss-120b');
  });

  it('omite los proveedores sin llave', () => {
    conEnv({ ...BASE, GOOGLE_GENERATIVE_AI_API_KEY: '' });
    expect(cadenaDeModelos('pepe')).toEqual(['groq:openai/gpt-oss-20b']);
  });
});

describe('esperaPorLimite', () => {
  it('espera solo si Groq pide pocos segundos', () => {
    expect(esperaPorLimite(new Error('Rate limit reached. Please try again in 1.5s'))).toBe(1600);
    expect(esperaPorLimite(new Error('Rate limit reached. Please try again in 20s'))).toBeNull();
    expect(esperaPorLimite(new Error('otro error'))).toBeNull();
  });
});
