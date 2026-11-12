import { afterEach, describe, expect, it } from 'vitest';
import { hayLLM, limpiarLlaveRechazada, llaveRechazada, marcarLlaveRechazada } from './llm';

describe('cuarentena de la llave del modelo', () => {
  afterEach(() => {
    limpiarLlaveRechazada();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('con llave y sin rechazo hay modelo; tras un 401 se trabaja sin modelo un rato y luego vuelve', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-prueba';
    expect(hayLLM()).toBe(true);
    expect(llaveRechazada()).toBe(false);
    marcarLlaveRechazada(50);
    expect(hayLLM()).toBe(false);
    expect(llaveRechazada()).toBe(true);
    marcarLlaveRechazada(-1);
    expect(hayLLM()).toBe(true);
  });

  it('sin llave nunca hay modelo ni cuarentena', () => {
    marcarLlaveRechazada();
    expect(hayLLM()).toBe(false);
    expect(llaveRechazada()).toBe(false);
  });
});
