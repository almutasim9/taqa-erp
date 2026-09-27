export type FinancierRule =
  | { type: 'capital_first'; capital: bigint; financierProfit: bigint }
  | { type: 'pro_rata'; financierCapital: bigint; contractValue: bigint; profitShareBasisPoints: number }
  | { type: 'custom' };

export type FinancierAllocation = { capitalReturn: bigint; financierProfit: bigint; companyShare: bigint };

/** Stateless, testable strategy. Persist all allocation rows in the same DB transaction as a payment. */
export function allocateFinancierCollection(payment: bigint, rule: FinancierRule, returnedCapital: bigint, recognizedProfit: bigint): FinancierAllocation {
  if (payment <= 0n) throw new Error('Collection must be positive.');
  if (rule.type === 'custom') throw new Error('Custom agreement requires an approved allocation strategy.');
  if (rule.type === 'capital_first') {
    const capitalDue = rule.capital > returnedCapital ? rule.capital - returnedCapital : 0n;
    const capitalReturn = payment > capitalDue ? capitalDue : payment;
    const profitDue = rule.financierProfit > recognizedProfit ? rule.financierProfit - recognizedProfit : 0n;
    const financierProfit = payment - capitalReturn > profitDue ? profitDue : payment - capitalReturn;
    return { capitalReturn, financierProfit, companyShare: payment - capitalReturn - financierProfit };
  }
  const capitalReturn = payment * rule.financierCapital / rule.contractValue;
  const contractProfit = payment - capitalReturn;
  const financierProfit = contractProfit * BigInt(rule.profitShareBasisPoints) / 10000n;
  return { capitalReturn, financierProfit, companyShare: payment - capitalReturn - financierProfit };
}
