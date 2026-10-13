/**
 * Célula de CSV segura para abrir no Excel/Planilhas.
 *
 * Texto que começa com = + - @ (ou tab/retorno) é interpretado como fórmula
 * pela planilha — e as descrições vêm de extratos de banco, ou seja, de nomes
 * escritos por terceiros. Um apóstrofo na frente faz a planilha tratar como
 * texto. Números (valores) não passam por aqui, senão um negativo viraria texto.
 */
export function celulaTexto(valor: unknown): string {
  let texto = String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Valor numérico no formato brasileiro (vírgula decimal), sem aspas. */
export function celulaNumero(valor: number, casas = 2): string {
  return valor.toFixed(casas).replace(".", ",");
}
