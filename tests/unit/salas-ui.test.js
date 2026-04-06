import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLegacyScript } from '../helpers/load-legacy-script.js';

describe('salas ui helpers', () => {
  let elements;
  let ctx;

  beforeEach(() => {
    localStorage.clear();
    elements = new Map([
      ['roomList', { innerHTML: '' }],
      ['roomListEmpty', { style: { display: 'none' } }],
      ['settRoomList', { innerHTML: '' }],
      ['btnRevelarSalas', { style: { display: 'none' } }],
      ['currentRoomLabel', { textContent: '' }],
      ['currentRoomMeta', { textContent: '' }],
      ['scannerRoomLabel', { textContent: '' }],
      ['scanRoomBadge', { textContent: '' }],
      ['noPatRoom', { textContent: '' }],
      ['msTotal', { textContent: '' }],
      ['msNopat', { textContent: '' }],
      ['msSalas', { textContent: '' }],
      ['msSalasVisitadas', { innerHTML: '' }],
      ['msSalasNaoVisitadas', { innerHTML: '' }]
    ]);

    ctx = runLegacyScript('js/features/salas.js', {
      SALA_MAP: {
        'ALMOXARIFADO (Bloco A)': { curto: 'Almoxarifado', bloco: 'Bloco A', emoji: '📦' },
        'BIBLIOTECA (Bloco A)': { curto: 'Biblioteca', bloco: 'Bloco A', emoji: '📚' }
      },
      state: {
        rooms: ['ALMOXARIFADO (Bloco A)', 'BIBLIOTECA (Bloco A)'],
        scans: [{ room: 'ALMOXARIFADO (Bloco A)', type: 'scan' }],
        currentRoom: 'ALMOXARIFADO (Bloco A)',
        pinnedRooms: [],
        hiddenRooms: []
      },
      window: {
        _modoComparacao: false,
        _selecionandoParaScan: false
      },
      esc: (value) => String(value || ''),
      escJ: (value) => String(value || ''),
      goBack: vi.fn(),
      abrirComparacao: vi.fn(),
      abrirTelaScanner: vi.fn(),
      renderSettRooms: vi.fn(),
      showToast: vi.fn(),
      showCampusDetalhe: vi.fn(),
      confirm: vi.fn(() => true),
      alert: vi.fn(),
      prompt: vi.fn(() => ''),
      roomIcon: vi.fn(() => '📍'),
      suapTotais: {
        'ALMOXARIFADO (Bloco A)': 10,
        'BIBLIOTECA (Bloco A)': 8
      },
      document: {
        getElementById(id) {
          return elements.get(id) || null;
        },
        querySelector: vi.fn(() => null)
      }
    });
  });

  it('formats current room display and updates labels', () => {
    const room = ctx.getCurrentRoomDisplay('LABORATORIO DE INFORMATICA (AREA EXTERNA)');

    expect(room.title).toContain('Laboratorio');
    expect(room.meta).toContain('Area Externa');

    ctx.updateRoomLabel();
    expect(elements.get('currentRoomLabel').textContent).toBe('Almoxarifado');
    expect(elements.get('scanRoomBadge').textContent).toContain('Almoxarifado');
  });

  it('renders room list with pin action and grouped rooms', () => {
    ctx.renderRoomList();

    expect(elements.get('roomList').innerHTML).toContain('Almoxarifado');
    expect(elements.get('roomList').innerHTML).toContain('Bloco A');

    ctx.togglePin('BIBLIOTECA (Bloco A)');
    expect(ctx.state.pinnedRooms).toContain('BIBLIOTECA (Bloco A)');
    expect(localStorage.getItem('pinnedRooms')).toContain('BIBLIOTECA');
  });

  it('selects room and handles scan shortcut flow', () => {
    ctx.window._selecionandoParaScan = true;

    ctx.selectRoom('BIBLIOTECA (Bloco A)');

    expect(ctx.state.currentRoom).toBe('BIBLIOTECA (Bloco A)');
    expect(localStorage.getItem('currentRoom')).toBe('BIBLIOTECA (Bloco A)');
    expect(ctx.abrirTelaScanner).toHaveBeenCalled();
  });

  it('routes room selection to comparison mode when enabled', () => {
    ctx.window._modoComparacao = true;

    ctx.selectRoom('BIBLIOTECA (Bloco A)');

    expect(ctx.window._modoComparacao).toBe(false);
    expect(ctx.goBack).toHaveBeenCalled();
    expect(ctx.abrirComparacao).toHaveBeenCalledWith('BIBLIOTECA (Bloco A)');
  });

  it('renders settings list and can hide then reveal rooms', () => {
    ctx.renderSettRooms();
    expect(elements.get('settRoomList').innerHTML).toContain('Almoxarifado');

    ctx.ocultarSala('BIBLIOTECA (Bloco A)');
    expect(ctx.state.hiddenRooms).toContain('BIBLIOTECA (Bloco A)');

    ctx.renderSettRooms();
    expect(elements.get('btnRevelarSalas').style.display).toBe('block');

    ctx.revelarTodasSalas();
    expect(ctx.state.hiddenRooms).toEqual([]);
    expect(ctx.state.pinnedRooms).toEqual([]);
  });

  it('adds and removes custom rooms', () => {
    ctx.prompt = vi.fn(() => 'NOVA SALA');
    ctx.document.querySelector = vi.fn(() => null);

    ctx.addRoom();
    expect(ctx.state.rooms).toContain('NOVA SALA');
    expect(localStorage.getItem('rooms')).toContain('NOVA SALA');

    ctx.removeRoom('NOVA SALA');
    expect(ctx.state.rooms).not.toContain('NOVA SALA');
  });

  it('renders visited and unvisited rooms summary', () => {
    ctx.state.scans.push({ room: 'BIBLIOTECA (Bloco A)', type: 'scan' });
    ctx.state.scans.push({ room: 'BIBLIOTECA (Bloco A)', type: 'nopat' });

    ctx.renderMinhasSalas();

    expect(elements.get('msTotal').textContent).toBe(2);
    expect(elements.get('msNopat').textContent).toBe(1);
    expect(elements.get('msSalas').textContent).toBe(2);
    expect(elements.get('msSalasVisitadas').innerHTML).toContain('Biblioteca');
  });
});
