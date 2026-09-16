type FinancialJob = {
  price: unknown;
  paymentMethod?: string;
};

type FinancialExpense = {
  amount: unknown;
  category?: string;
};

export function summarizeFinances(
  jobs: FinancialJob[],
  expenses: FinancialExpense[]
) {
  const totalRevenue = jobs.reduce((sum, job) => sum + Number(job.price || 0), 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return {
    totalRevenue,
    totalExpense,
    netProfit: totalRevenue - totalExpense,
  };
}

/**
 * แยกสรุปยอดรายรับตามวิธีชำระเงิน (เงินสด vs เงินโอน)
 */
export function summarizePaymentMethods(jobs: FinancialJob[]) {
  let cashRevenue = 0;
  let transferRevenue = 0;

  jobs.forEach((j) => {
    const price = Number(j.price || 0);
    if (j.paymentMethod === "CASH") {
      cashRevenue += price;
    } else {
      transferRevenue += price;
    }
  });

  return { cashRevenue, transferRevenue };
}

/**
 * สรุปยอดรายจ่ายแยกตามหมวดหมู่
 */
export function summarizeExpensesByCategory(expenses: FinancialExpense[]) {
  let catFuel = 0;
  let catDisposal = 0;
  let catMaintenance = 0;
  let catSalary = 0;
  let catOther = 0;

  const byCategory: Record<string, number> = {};

  expenses.forEach((e) => {
    const amt = Number(e.amount || 0);
    const cat = e.category || "OTHER";
    byCategory[cat] = (byCategory[cat] || 0) + amt;

    if (cat === "FUEL") catFuel += amt;
    else if (cat === "DISPOSAL_FEE") catDisposal += amt;
    else if (cat === "MAINTENANCE") catMaintenance += amt;
    else if (cat === "SALARY") catSalary += amt;
    else catOther += amt;
  });

  return {
    catFuel,
    catDisposal,
    catMaintenance,
    catSalary,
    catOther,
    byCategory,
  };
}

/**
 * คำนวณอัตรากำไรสุทธิ (%)
 */
export function calculateProfitMargin(totalRevenue: number, netProfit: number): string {
  if (totalRevenue <= 0) return "-";
  return `${((netProfit / totalRevenue) * 100).toFixed(1)}%`;
}
