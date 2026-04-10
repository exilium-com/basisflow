import { DEFAULT_ACTIVE_LOAN, type LoanType, type Mortgage } from "./mortgageConfig";

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

export type MortgageYearlyBreakdownRow = {
  year: number;
  principal: number;
  interest: number;
};

export type MortgageArmDetails = {
  resetYears: number;
  adjustedRate: number;
  resetPayment: number;
} | null;

export type MortgageScenario = {
  mortgage: Mortgage;
  type: LoanType;
  typeLabel: string;
  isArm: boolean;
  primaryRate: number;
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

export function buildMortgageScenario(mortgage: Mortgage, selectedType: LoanType = mortgage.activeLoanType): MortgageScenario {
  const loanOption = mortgage.loanOptions[selectedType] || mortgage.loanOptions[DEFAULT_ACTIVE_LOAN];
  const loanAmount = Math.max(0, mortgage.homePrice - mortgage.downPaymentAmount);
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
    type: selectedType,
    typeLabel: loanOption.label,
    isArm,
    primaryRate,
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
