export type Installment = { number: number; dueDate: string; originalAmount: bigint; paidAmount: bigint; status: 'upcoming' | 'due' | 'partially_paid' | 'paid' | 'overdue' };
export type Allocation = { installmentNumber: number; amount: bigint };

/** Amounts are IQD integers. The final installment absorbs any rounding remainder. */
export function buildInstallmentSchedule(financedAmount: bigint, count: number, firstDueDate: Date, frequencyMonths = 1): Installment[] {
  if (financedAmount <= 0n) throw new Error('Financed amount must be greater than zero.');
  if (!Number.isInteger(count) || count < 1) throw new Error('Installment count must be a positive integer.');
  const base = financedAmount / BigInt(count);
  const remainder = financedAmount % BigInt(count);
  return Array.from({ length: count }, (_, index) => {
    const due = new Date(firstDueDate);
    due.setMonth(due.getMonth() + index * frequencyMonths);
    return { number: index + 1, dueDate: due.toISOString().slice(0, 10), originalAmount: base + (index === count - 1 ? remainder : 0n), paidAmount: 0n, status: 'upcoming' };
  });
}

/** Oldest unpaid installment is always paid first unless an authorized manual allocation is supplied. */
export function allocatePayment(amount: bigint, installments: Installment[]): Allocation[] {
  if (amount <= 0n) throw new Error('Payment amount must be greater than zero.');
  let remaining = amount;
  const allocations: Allocation[] = [];
  for (const installment of [...installments].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    const balance = installment.originalAmount - installment.paidAmount;
    if (balance <= 0n || remaining === 0n) continue;
    const allocated = remaining < balance ? remaining : balance;
    allocations.push({ installmentNumber: installment.number, amount: allocated });
    remaining -= allocated;
  }
  return allocations;
}
