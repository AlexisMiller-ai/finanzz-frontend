import type { Account } from "../types";

/**
 * Conta de investimento (ex.: caixinha, CDB) é reserva: aparece no app, mas não
 * conta como dinheiro disponível para gastar nem entra na sobra do mês.
 */
export function isReserve(account: Pick<Account, "kind">): boolean {
  return account.kind === "investimento";
}
