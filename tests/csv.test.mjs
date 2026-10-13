// Proteção contra fórmulas ao abrir o CSV exportado numa planilha.
import { celulaNumero, celulaTexto } from '../src/utils/csv.ts';

let fails = 0;
const eq = (nome, atual, esperado) => {
  const ok = atual === esperado;
  console.log((ok ? 'PASS ' : 'FAIL ') + nome + (ok ? '' : ` -> ${atual} (esperado ${esperado})`));
  if (!ok) fails++;
};

eq('texto comum fica entre aspas', celulaTexto('Mercado'), '"Mercado"');
eq('aspas dentro do texto são dobradas', celulaTexto('Bar "do Zé"'), '"Bar ""do Zé"""');
eq('= vira texto', celulaTexto('=HYPERLINK("http://x","clique")'), '"\'=HYPERLINK(""http://x"",""clique"")"');
eq('+ vira texto', celulaTexto('+5511999999999'), '"\'+5511999999999"');
eq('- no início de texto vira texto', celulaTexto('-2+3'), '"\'-2+3"');
eq('@ vira texto', celulaTexto('@SUM(A1)'), '"\'@SUM(A1)"');
eq('tab no início vira texto', celulaTexto('\t=1'), '"\'\t=1"');
eq('vazio e nulo', celulaTexto(null), '""');
eq('número negativo continua número', celulaNumero(-120.5), '-120,50');
eq('casas decimais configuráveis', celulaNumero(69.83, 1), '69,8');

console.log(fails ? `\n${fails} FALHA(S)` : '\nTODOS OS TESTES PASSARAM');
process.exit(fails ? 1 : 0);
