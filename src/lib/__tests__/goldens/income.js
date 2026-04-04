export const incomeGoldens = [
  {
    name: "250k income with maxed 401k and hsa",
    scenario: {
      salary: 250000,
      inputs: {
        employee401k: 24500,
        hsaContribution: 4400,
        iraContribution: 7000,
        megaBackdoorInput: 35250,
        matchRate: 50,
      },
    },
    expected: {
      federalTax: 42056,
      californiaTax: 16879.48,
      fica: {
        total: 15514,
      },
      caSdi: 3250,
      totalTaxes: 77699.48,
    },
  },
  {
    name: "200k income with no HSA and no traditional 401(k)",
    scenario: {
      salary: 200000,
      inputs: {
        employee401k: 0,
        hsaContribution: 0,
        iraContribution: 0,
        megaBackdoorInput: 0,
        matchRate: 0,
      },
    },
    expected: {
      federalTax: 36734,
      californiaTax: 14507.98,
      fica: {
        total: 14339,
      },
      caSdi: 2600,
    },
  },
];
