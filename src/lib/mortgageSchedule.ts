import { DEFAULT_MORTGAGE_STATE, resolveAmountFromMode, type MortgageState } from "./mortgageConfig";

type MortgageScheduleRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

type MortgageScheduleSegmentOptions = {
  balance: number;
  annualRate: number;
  payment: number;
  segmentMonths: number;
  startMonth: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
};

type FixedScheduleParams = {
  loanAmount: number;
  annualRate: number;
  totalMonths: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
};

type ArmScheduleParams = {
  loanAmount: number;
  totalMonths: number;
  initialRate: number;
  adjustedRate: number;
  resetYears: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
};

type MortgageYearlyBreakdownRow = {
  year: number;
  principal: number;
  interest: number;
};

type MortgageArmDetails = {
  resetYears: number;
  adjustedRate: number;
  resetPayment: number;
} | null;

type MortgageLoan =
  | {
      id: string;
      kind: "conventional";
      term: number;
      rate: number;
    }
  | {
      id: string;
      kind: "arm";
      term: number;
      fixedYears: number;
      initialRate: number;
      adjustedRate: number;
    }
  | {
      id: string;
      kind: "rent";
      rentPerMonth: number;
      rentGrowthRate: number;
    };

export type MortgageScenario = {
  mortgage: MortgageState;
  optionId: string;
  kind: MortgageState["options"][number]["kind"];
  isArm: boolean;
  primaryRate: number;
  rentGrowthRate: number;
  loanAmount: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  principalInterest: number;
  totalMonthlyPayment: number;
  totalInterest: number;
  schedule: MortgageScheduleRow[];
  modeledMonths: number;
  armDetails: MortgageArmDetails;
  yearlyBreakdown: MortgageYearlyBreakdownRow[];
};

function calculateMonthlyPayment(principal: number, annualRate: number, totalMonths: number) {
  if (principal <= 0 || totalMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    return principal / totalMonths;
  }

  return principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -totalMonths)));
}

function appendScheduleSegment(schedule: MortgageScheduleRow[], options: MortgageScheduleSegmentOptions) {
  const {
    balance: startingBalance,
    annualRate,
    payment,
    segmentMonths,
    startMonth,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
  } = options;

  let balance = startingBalance;
  let totalInterest = 0;
  const monthlyRate = annualRate / 100 / 12;

  for (let offset = 0; offset < segmentMonths && balance > 0.005; offset += 1) {
    const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
    let principal = payment - interest;

    if (principal > balance) {
      principal = balance;
    }
    if (principal < 0) {
      principal = 0;
    }

    const fullPayment = principal + interest + monthlyTax + monthlyInsurance + monthlyHoa;
    balance = Math.max(0, balance - principal);
    totalInterest += interest;

    schedule.push({
      month: startMonth + offset,
      payment: fullPayment,
      principal,
      interest,
      balance,
    });
  }

  return {
    balance,
    totalInterest,
  };
}

function generateFixedSchedule(params: FixedScheduleParams) {
  const { loanAmount, annualRate, totalMonths, monthlyTax, monthlyInsurance, monthlyHoa } = params;

  const schedule: MortgageScheduleRow[] = [];
  const payment = calculateMonthlyPayment(loanAmount, annualRate, totalMonths);
  const result = appendScheduleSegment(schedule, {
    balance: loanAmount,
    annualRate,
    payment,
    segmentMonths: totalMonths,
    startMonth: 1,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
  });

  return {
    schedule,
    payment,
    totalInterest: result.totalInterest,
    modeledMonths: schedule.length,
  };
}

function generateArmSchedule(params: ArmScheduleParams) {
  const { loanAmount, totalMonths, initialRate, adjustedRate, resetYears, monthlyTax, monthlyInsurance, monthlyHoa } =
    params;

  const schedule: MortgageScheduleRow[] = [];
  const initialMonths = Math.min(resetYears * 12, totalMonths);
  const initialPayment = calculateMonthlyPayment(loanAmount, initialRate, totalMonths);

  const initialResult = appendScheduleSegment(schedule, {
    balance: loanAmount,
    annualRate: initialRate,
    payment: initialPayment,
    segmentMonths: initialMonths,
    startMonth: 1,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
  });

  let totalInterest = initialResult.totalInterest;
  let resetPayment = initialPayment;
  let finalBalance = initialResult.balance;

  const remainingMonths = Math.max(totalMonths - schedule.length, 0);
  if (remainingMonths > 0 && finalBalance > 0.005) {
    resetPayment = calculateMonthlyPayment(finalBalance, adjustedRate, remainingMonths);

    const adjustedResult = appendScheduleSegment(schedule, {
      balance: finalBalance,
      annualRate: adjustedRate,
      payment: resetPayment,
      segmentMonths: remainingMonths,
      startMonth: initialMonths + 1,
      monthlyTax,
      monthlyInsurance,
      monthlyHoa,
    });

    totalInterest += adjustedResult.totalInterest;
    finalBalance = adjustedResult.balance;
  }

  return {
    schedule,
    payment: initialPayment,
    resetPayment,
    totalInterest,
    modeledMonths: schedule.length,
    finalBalance,
  };
}

function yearlyComposition(schedule: MortgageScheduleRow[]) {
  const yearsList: MortgageYearlyBreakdownRow[] = [];

  schedule.forEach((row) => {
    const yearIndex = Math.floor((row.month - 1) / 12);
    if (!yearsList[yearIndex]) {
      yearsList[yearIndex] = {
        year: yearIndex + 1,
        principal: 0,
        interest: 0,
      };
    }

    yearsList[yearIndex].principal += row.principal;
    yearsList[yearIndex].interest += row.interest;
  });

  return yearsList;
}

function resolveLoanOption(option: MortgageState["options"][number]): MortgageLoan {
  if (option.kind === "rent") {
    return {
      id: option.id,
      kind: "rent",
      rentPerMonth: Math.max(0, option.rentPerMonth ?? 3500),
      rentGrowthRate: option.rentGrowthRate ?? 3,
    };
  }

  if (option.kind === "arm") {
    const initialRate = option.initialRate ?? 5.635;

    return {
      id: option.id,
      kind: "arm",
      term: Math.max(1, Math.round(option.term ?? 30)),
      fixedYears: Math.max(1, Math.round(option.fixedYears ?? 7)),
      initialRate,
      adjustedRate: option.adjustedRate ?? initialRate,
    };
  }

  return {
    id: option.id,
    kind: "conventional",
    term: Math.max(1, Math.round(option.term ?? 30)),
    rate: option.rate ?? 6.475,
  };
}

export function buildMortgageScenario(
  mortgage: MortgageState,
  selectedOptionId: string = mortgage.activeLoanId,
): MortgageScenario {
  const options = mortgage.options.length > 0 ? mortgage.options : DEFAULT_MORTGAGE_STATE.options;
  const loanOption = resolveLoanOption(
    options.find((option) => option.id === selectedOptionId) ??
      options.find((option) => option.id === mortgage.activeLoanId) ??
      options[0],
  );
  if (loanOption.kind === "rent") {
    return {
      mortgage,
      optionId: loanOption.id,
      kind: "rent",
      isArm: false,
      primaryRate: 0,
      rentGrowthRate: loanOption.rentGrowthRate,
      loanAmount: 0,
      monthlyTax: 0,
      monthlyInsurance: 0,
      monthlyHoa: 0,
      principalInterest: 0,
      totalMonthlyPayment: loanOption.rentPerMonth,
      totalInterest: 0,
      schedule: [],
      modeledMonths: 0,
      armDetails: null,
      yearlyBreakdown: [],
    };
  }

  const downPaymentAmount = resolveAmountFromMode(mortgage.downPayment, mortgage.homePrice);
  const loanAmount = Math.max(0, mortgage.homePrice - downPaymentAmount);
  const monthlyTax = (mortgage.homePrice * (mortgage.propertyTaxRate / 100)) / 12;
  const monthlyInsurance = mortgage.insurancePerYear / 12;
  const monthlyHoa = mortgage.hoaPerMonth;
  const totalMonths = Math.max(1, Math.round(loanOption.term * 12));
  const isArm = loanOption.kind === "arm";

  let scheduleData;
  const primaryRate = isArm ? loanOption.initialRate : loanOption.rate;
  let armDetails: MortgageArmDetails = null;

  if (isArm) {
    scheduleData = generateArmSchedule({
      loanAmount,
      totalMonths,
      initialRate: loanOption.initialRate,
      adjustedRate: loanOption.adjustedRate,
      resetYears: loanOption.fixedYears,
      monthlyTax,
      monthlyInsurance,
      monthlyHoa,
    });

    armDetails = {
      resetYears: loanOption.fixedYears,
      adjustedRate: loanOption.adjustedRate,
      resetPayment: scheduleData.resetPayment,
    };
  } else {
    scheduleData = generateFixedSchedule({
      loanAmount,
      annualRate: loanOption.rate,
      totalMonths,
      monthlyTax,
      monthlyInsurance,
      monthlyHoa,
    });
  }

  const firstRow = scheduleData.schedule[0];
  const totalMonthlyPayment = firstRow ? firstRow.payment : 0;

  return {
    mortgage,
    optionId: loanOption.id,
    kind: loanOption.kind,
    isArm,
    primaryRate,
    rentGrowthRate: 0,
    loanAmount,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
    principalInterest: scheduleData.payment,
    totalMonthlyPayment,
    totalInterest: scheduleData.totalInterest,
    schedule: scheduleData.schedule,
    modeledMonths: scheduleData.modeledMonths,
    armDetails,
    yearlyBreakdown: yearlyComposition(scheduleData.schedule),
  };
}
