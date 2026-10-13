// Testes dos leitores de extrato (CSV e OFX) em src/utils/importParsers.ts.
// O Node lê o TypeScript direto (só remove os tipos), sem passo de build.
// Rodar com: npm test
import * as P from '../src/utils/importParsers.ts';

let fails = 0;
const check = (name, cond, extra) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' ' + JSON.stringify(extra)));
  if (!cond) fails++;
};
const eq = (name, actual, expected) =>
  check(name, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected });

/* ---- valores ---- */
eq('valor BR com milhar', P.parseAmount('1.234,56'), 1234.56);
eq('valor US', P.parseAmount('1,234.56'), 1234.56);
eq('valor simples com vírgula', P.parseAmount('90,50'), 90.5);
eq('valor com R$', P.parseAmount('R$ 1.500,00'), 1500);
eq('valor negativo', P.parseAmount('-45,90'), -45.9);
eq('valor entre parênteses é negativo', P.parseAmount('(50,00)'), -50);
eq('sufixo D é débito', P.parseAmount('120,00 D'), -120);
eq('sufixo C é crédito', P.parseAmount('120,00 C'), 120);
eq('milhar sem decimais', P.parseAmount('1.234'), 1234);
eq('ponto decimal', P.parseAmount('12.34'), 12.34);
eq('texto inválido', P.parseAmount('saldo'), null);

/* ---- datas ---- */
eq('data BR', P.parseDate('15/09/2026'), '2026-09-15');
eq('data ISO', P.parseDate('2026-09-15'), '2026-09-15');
eq('data com 2 dígitos no ano', P.parseDate('15/09/26'), '2026-09-15');
eq('data com ponto', P.parseDate('15.09.2026'), '2026-09-15');
eq('data OFX', P.parseDate('20260915120000[-3:BRT]'), '2026-09-15');
eq('data americana detectada', P.parseDate('03/15/2026'), '2026-03-15');
eq('data inexistente', P.parseDate('31/02/2026'), null);
eq('não é data', P.parseDate('descrição'), null);

/* ---- CSV estilo Nubank (vírgula, valor único negativo) ---- */
const nubank = `date,category,title,amount
2026-09-02,transporte,Uber* Trip,-24.90
2026-09-03,restaurante,iFood *Pizzaria,-78.50
2026-09-05,receita,Pagamento recebido,1500.00`;
let table = P.parseCsv(nubank);
check('nubank: cabeçalho detectado', table.hasHeader && table.headers[0] === 'date', table.headers);
let map = P.guessMapping(table);
let rows = P.rowsFromCsv(table, map);
eq('nubank: 3 linhas', rows.length, 3);
eq('nubank: primeira linha', rows[0], { date: '2026-09-02', description: 'Uber* Trip', amount: -24.9 });
eq('nubank: entrada positiva', rows[2].amount, 1500);

/* ---- CSV estilo Itaú (ponto e vírgula, sem cabeçalho, data BR) ---- */
const itau = `01/09/2026;SAQUE 24H;-100,00
02/09/2026;PIX RECEBIDO JOAO;250,00
03/09/2026;SUPERMERCADO EXTRA;-432,15`;
table = P.parseCsv(itau);
check('itaú: delimitador ;', table.delimiter === ';', table.delimiter);
check('itaú: sem cabeçalho', table.hasHeader === false, table.hasHeader);
map = P.guessMapping(table);
rows = P.rowsFromCsv(table, map);
eq('itaú: 3 linhas', rows.length, 3);
eq('itaú: descrição e valor', [rows[2].description, rows[2].amount], ['SUPERMERCADO EXTRA', -432.15]);

/* ---- CSV com colunas separadas de entrada e saída ---- */
const duasColunas = `Data;Histórico;Débito;Crédito
10/09/2026;ALUGUEL;1800,00;
11/09/2026;SALARIO;;6500,00`;
table = P.parseCsv(duasColunas);
map = P.guessMapping(table);
check('duas colunas detectadas', map.amountIn !== undefined && map.amountOut !== undefined, map);
rows = P.rowsFromCsv(table, map);
eq('débito vira negativo', rows[0].amount, -1800);
eq('crédito vira positivo', rows[1].amount, 6500);

/* ---- CSV com aspas e ponto e vírgula dentro do texto ---- */
const comAspas = `Data;Descricao;Valor
12/09/2026;"MERCADO; FILIAL 2";"1.200,50"`;
table = P.parseCsv(comAspas);
rows = P.rowsFromCsv(table, P.guessMapping(table));
eq('aspas preservam o texto', rows[0], { date: '2026-09-12', description: 'MERCADO; FILIAL 2', amount: 1200.5 });

/* ---- OFX ---- */
const ofx = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260914120000[-03:EST]<TRNAMT>-89.90<FITID>2026091401<MEMO>FARMACIA SAO JOAO</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260915<TRNAMT>3200.00<FITID>2026091502<NAME>TRANSFERENCIA<MEMO>SALARIO EMPRESA</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
check('reconhece OFX', P.isOfx('extrato.ofx', ofx), true);
const ofxRows = P.parseOfx(ofx);
eq('ofx: 2 lançamentos', ofxRows.length, 2);
eq('ofx: débito', ofxRows[0], { date: '2026-09-14', description: 'FARMACIA SAO JOAO', amount: -89.9, externalId: 'ofx:2026091401' });
eq('ofx: junta NAME e MEMO', ofxRows[1].description, 'TRANSFERENCIA - SALARIO EMPRESA');
eq('ofx: guarda o FITID', ofxRows[1].externalId, 'ofx:2026091502');

/* ---- identificadores para reimportação ---- */
const iguais = P.withFingerprints([
  { date: '2026-09-04', description: 'PADARIA', amount: -10 },
  { date: '2026-09-04', description: 'PADARIA', amount: -10 },
]);
check('linhas idênticas recebem ids diferentes', iguais[0].externalId !== iguais[1].externalId, iguais);
const denovo = P.withFingerprints([{ date: '2026-09-04', description: 'PADARIA', amount: -10 }]);
check('mesmo arquivo gera o mesmo id', denovo[0].externalId === iguais[0].externalId, [denovo[0].externalId, iguais[0].externalId]);
check('id cabe na coluna (80)', iguais[0].externalId.length <= 80, iguais[0].externalId.length);
check('ofx mantém o id da origem', P.withFingerprints(ofxRows)[0].externalId === 'ofx:2026091401', true);

console.log(fails ? `\n${fails} FALHA(S)` : '\nTODOS OS TESTES PASSARAM');
process.exit(fails ? 1 : 0);
