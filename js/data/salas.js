window.ROOM_ICONS = ['🏛️', '📚', '🔬', '🍽️', '🏥', '🏠', '📦', '🚪', '🖥️', '⚙️'];

function roomIcon(i) {
  return ROOM_ICONS[i % ROOM_ICONS.length];
}

function normalizarSalaBase(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function extrairSalaBase(nome) {
  var full = String(nome || '').trim();
  var pi = full.indexOf('(');
  var pf = full.lastIndexOf(')');
  var curto = pi > -1 ? full.slice(0, pi).trim() : full;
  var bloco = (pi > -1 && pf > pi) ? full.slice(pi + 1, pf).trim() : '';
  return { full: full, curto: curto, bloco: bloco };
}

function detectarEmojiSala(chave) {
  if (/BIBLIOTECA|LIVRO/.test(chave)) return '📚';
  if (/LABORATORIO|LAB\.|QUIMICA|BIOLOGIA|FISICA|IFMAKER|SERTI|HUMANAS/.test(chave)) return '🔬';
  if (/INFORMATICA|DATACENTER|STUDIO|ESTUDIO|GAMELAB|LOGICA/.test(chave)) return '🖥️';
  if (/COPA|COZINHA|CANTINA|REFEITORIO/.test(chave)) return '🍽️';
  if (/ENFERMARIA|CEREL|NAPNE/.test(chave)) return '🏥';
  if (/SALA DOS PROFESSORES|PROFESSORES/.test(chave)) return '👨‍🏫';
  if (/SALA DE REUNIOES|REUNIOES/.test(chave)) return '🤝';
  if (/ROBOTICA/.test(chave)) return '🤖';
  if (/QUADRA/.test(chave)) return '🏀';
  if (/BOSQUE|AREA DE CONVIVENCIA|PATIO/.test(chave)) return '🏞️';
  if (/GUARITA|ENTRADA/.test(chave)) return '🚪';
  if (/ESTACIONAMENTO/.test(chave)) return '🚗';
  if (/ALMOXARIFADO|PATRIMONIO|CONTAINER|SALA VAGA/.test(chave)) return '📦';
  if (/SHAFT|APOIO|CRC|BARRACAO/.test(chave)) return '⚙️';
  if (/GABINETE|DIRAD|DIREN|DIRGE|NUGED|CENID|M-01|COORDENACOES/.test(chave)) return '🏢';
  if (/SL 0|SALA DE AULA|PERMANENCIA ESTUDANTIL|ASSISTENTE DE ALUNOS/.test(chave)) return '🎓';
  return '📍';
}

function customizarSala(curto, chave) {
  if (/ALMOXARIFADO/.test(chave)) return 'Almoxarifado';
  if (/APOIO ALMOXARIFADO/.test(chave)) return 'Apoio Almoxarifado';
  if (/LABORATORIO INFORMATICA 1/.test(chave)) return 'Lab. Informatica 1';
  if (/LABORATORIO INFORMATICA 2/.test(chave)) return 'Lab. Informatica 2';
  if (/LABORATORIO INFORMATICA 3/.test(chave)) return 'Lab. Informatica 3';
  if (/LABORATORIO INFORMATICA 4/.test(chave)) return 'Lab. Informatica 4';
  if (/LABORATORIO INFORMATICA 5/.test(chave)) return 'Lab. Informatica 5';
  if (/LABORATORIO BIOLOGIA\/FISICA/.test(chave)) return 'Lab. Biologia/Fisica';
  if (/LABORATORIO QUIMICA\/MATEMATICA/.test(chave)) return 'Lab. Quimica/Mat.';
  if (/SALA DE REUNIOES/.test(chave)) return 'Sala de Reunioes';
  if (/SALA APOIO COALP/.test(chave)) return 'Apoio COALP/COADS';
  if (/SALA DE APOIO TERCEIRIZADOS/.test(chave)) return 'Apoio Terceirizados';
  if (/SALA DE ATENDIMENTO NUGED/.test(chave)) return 'Atendimento NUGED';
  if (/SHAFT CENTRAL INFERIOR BLOCO A/.test(chave)) return 'Shaft Central Inf. Bloco A';
  if (/SHAFT CENTRAL BLOCO A SUPERIOR/.test(chave)) return 'Shaft Central Sup. Bloco A';
  if (/SHAFT SUPERIOR ESCADA BLOCO A/.test(chave)) return 'Shaft Escada Bloco A';
  if (/SHAFT CENTRAL INFERIOR BLOCO B/.test(chave)) return 'Shaft Central Inf. Bloco B';
  if (/SHAFT SUPERIOR ESCADA BLOCO B/.test(chave)) return 'Shaft Escada Bloco B';
  if (/SHAFT LABORATORIO INFORMATICA 4/.test(chave)) return 'Shaft Lab. Informatica 4';
  if (/AREA DAS SALAS MODULARES/.test(chave)) return 'Area Salas Modulares';
  if (/ALMOXARIFADO CONTAINER/.test(chave)) return 'Almoxarifado Container';
  if (/PATRIMONIO CONTAINER/.test(chave)) return 'Container Patrimonio';
  if (/QUADRA POLIESPORTIVA/.test(chave)) return 'Quadra Poliesportiva';
  if (/ESTACIONAMENTO VEICULOS OFICIAIS/.test(chave)) return 'Estac. Veiculos Oficiais';
  if (/ENTRADA DOS ESTUDANTES/.test(chave)) return 'Entrada Estudantes';
  if (/AREA DE CONVIVENCIA/.test(chave)) return 'Area de Convivencia';
  return curto.replace(/\s+/g, ' ').trim();
}

function buildSalaMeta(nome) {
  var parsed = extrairSalaBase(nome);
  var chave = normalizarSalaBase(parsed.curto);
  return {
    curto: customizarSala(parsed.curto, chave),
    bloco: parsed.bloco,
    emoji: detectarEmojiSala(chave)
  };
}

window.SALA_MAP = getSalasSUAP().reduce(function(acc, nome) {
  acc[nome] = buildSalaMeta(nome);
  return acc;
}, {});

window.SALA_GRUPOS = getSalasSUAP().reduce(function(acc, nome) {
  var meta = SALA_MAP[nome];
  var grupo = meta.bloco || 'Outros';
  if (!acc[grupo]) acc[grupo] = [];
  acc[grupo].push({
    nome: meta.curto,
    emoji: meta.emoji,
    original: nome
  });
  return acc;
}, {});
