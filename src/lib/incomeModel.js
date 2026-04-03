import { clamp } from "./format";
import { computeProgressiveTax } from "./taxConfig";

function annualizeSalary(amount, frequency = "annual") {
  const safeAmount = Math.max(0, amount);
  return frequency === "monthly" ? safeAmount * 12 : safeAmount;
}

function averageGrowthFactor(growthRate, startYearOffset) {
  const effectiveGrowth = Math.max(-0.99, growthRate);
  if (effectiveGrowth === 0) {
    return 1;
  }

  const growthBase = 1 + effectiveGrowth;
  return (
    (Math.pow(growthBase, startYearOffset + 1) -
      Math.pow(growthBase, startYearOffset)) /
    Math.log(growthBase)
  );
}


export function computeFica(grossSalary, hsaPayrollAmount) {
  const ficaWages = Math.max(0, grossSalary - hsaPayrollAmount);
  const socialSecurityWageBase = 184500;
  const socialSecurity = Math.min(ficaWages, socialSecurityWageBase) * 0.062;
  const medicare = ficaWages * 0.0145;
  const additionalMedicare = Math.max(0, ficaWages - 200000) * 0.009;

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: socialSecurity + medicare + additionalMedicare,
  };
}

export function getAnnualSalaryTotal(salaryItems = []) {
  return salaryItems.reduce(
    (sum, item) =>
      sum + annualizeSalary(item.amount, item.frequency),
    0,
  );
}

export function computeSavings(inputs, taxConfig) {
  const matchRate = clamp(inputs.matchRate / 100, 0, 5);
  const employee401k = Math.max(0, inputs.employee401k);
  const iraContribution = Math.max(0, inputs.iraContribution);
  const annualAdditions = Math.max(0, taxConfig.annualAdditionsLimit);
  const employerMatch = employee401k * matchRate;
  const availableMegaRoom = Math.max(
    0,
    annualAdditions - employee401k - employerMatch,
  );
  const mega = clamp(Math.max(0, inputs.megaBackdoorInput), 0, availableMegaRoom);

  return {
    employerMatch,
    mega,
    iraContribution,
    availableMegaRoom,
  };
}

export function computeAnnualTaxes(inputs, taxConfig, extraOrdinaryIncome = 0) {
  const grossIncome = Math.max(0, inputs.grossSalary + extraOrdinaryIncome);
  const federalAdjustedGross = Math.max(
    0,
    grossIncome - inputs.employee401k - inputs.hsaContribution,
  );
  const federalTaxableIncome = Math.max(
    0,
    federalAdjustedGross - taxConfig.federalStandardDeduction,
  );
  const federalTax = computeProgressiveTax(
    federalTaxableIncome,
    taxConfig.federalBrackets,
  );

  const californiaAdjustedGross = Math.max(0, grossIncome - inputs.employee401k);
  const californiaTaxableIncome = Math.max(
    0,
    californiaAdjustedGross - taxConfig.stateStandardDeduction,
  );
  const californiaTax = computeProgressiveTax(
    californiaTaxableIncome,
    taxConfig.stateBrackets,
  );

  const fica = computeFica(grossIncome, inputs.hsaContribution);
  const caSdi = grossIncome * (taxConfig.caSdiRate / 100);

  return {
    federalTax,
    californiaTax,
    fica,
    caSdi,
    totalTaxes: federalTax + californiaTax + fica.total + caSdi,
  };
}

export function computeIncrementalTakeHome(inputs, taxConfig, extraOrdinaryIncome) {
  const safeExtra = Math.max(0, extraOrdinaryIncome);
  if (safeExtra <= 0) {
    return 0;
  }

  const baseTaxes = computeAnnualTaxes(inputs, taxConfig, 0).totalTaxes;
  const extraTaxes = computeAnnualTaxes(inputs, taxConfig, safeExtra).totalTaxes;
  return safeExtra - (extraTaxes - baseTaxes);
}

export function computeRsuGrossForYear(
  rsus,
  yearIndex,
  stockGrowthRate = 0,
) {
  const grantAmount = Math.max(0, rsus.grantAmount);
  const refresherAmount = Math.max(0, rsus.refresherAmount);
  const vestYears = Math.max(1, Math.round(rsus.vestingYears));

  let total = 0;
  if (grantAmount > 0 && yearIndex < vestYears) {
    total +=
      (grantAmount / vestYears) *
      averageGrowthFactor(stockGrowthRate, yearIndex);
  }

  for (
    let refresherIndex = 1;
    refresherIndex <= yearIndex;
    refresherIndex += 1
  ) {
    if (yearIndex - refresherIndex >= vestYears || refresherAmount <= 0) {
      continue;
    }
    total +=
      (refresherAmount / vestYears) *
      averageGrowthFactor(stockGrowthRate, yearIndex - refresherIndex);
  }

  return total;
}

export function computeRsuGrossForItems(
  rsuItems = [],
  yearIndex,
  stockGrowthRate = 0,
) {
  return rsuItems.reduce(
    (sum, rsu) => sum + computeRsuGrossForYear(rsu, yearIndex, stockGrowthRate),
    0,
  );
}

export function calculateIncome(inputs, taxConfig) {
  const grossSalary = getAnnualSalaryTotal(inputs.salaryItems);
  const savings = computeSavings(inputs, taxConfig);
  const taxInputs = { ...inputs, grossSalary };
  const taxes = computeAnnualTaxes(taxInputs, taxConfig, 0);
  const annualTakeHome =
    grossSalary -
    taxInputs.employee401k -
    taxInputs.hsaContribution -
    savings.iraContribution -
    savings.mega -
    taxes.totalTaxes;
  const rsuGrossNextYear = computeRsuGrossForItems(
    inputs.rsuItems,
    0,
  );
  const rsuNetNextYear = computeIncrementalTakeHome(
    taxInputs,
    taxConfig,
    rsuGrossNextYear,
  );

  return {
    ...savings,
    federalTax: taxes.federalTax,
    californiaTax: taxes.californiaTax,
    fica: taxes.fica,
    caSdi: taxes.caSdi,
    totalTaxes: taxes.totalTaxes,
    grossSalary,
    annualTakeHome,
    monthlyTakeHome: annualTakeHome / 12,
    rsuGrossNextYear,
    rsuNetNextYear,
  };
}
