import { describe, expect, it } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('room helpers', () => {
  const ctx = runLegacyScript('js/features/salas.js', {
    SALA_MAP: {},
    state: { rooms: [], scans: [], hiddenRooms: [], pinnedRooms: [] },
    localStorage: { setItem() {}, getItem() { return null; }, removeItem() {} }
  });

  it('formats current room display with friendly title and block', () => {
    const room = ctx.getCurrentRoomDisplay('LABORATORIO INFORMATICA 1 (Bloco B)');
    expect(room.title).toBe('Laboratorio Informatica 1');
    expect(room.meta).toContain('Bloco B');
  });

  it('returns default label when no room is selected', () => {
    expect(ctx.getCurrentRoomDisplay('').title).toBe('Selecionar local');
  });

  it('sentence case keeps separators readable', () => {
    expect(ctx.toSentenceCase('sala-dos professores')).toBe('Sala-Dos Professores');
  });
});
