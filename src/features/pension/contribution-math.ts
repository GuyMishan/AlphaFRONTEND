export function roundDecimal(value: number, decimals: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return Number(Math.round(Number(`${safe}e${decimals}`)) + `e-${decimals}`);
}

export const roundMoney = (value: number) => roundDecimal(value, 2);
export const roundPercentage = (value: number) => roundDecimal(value, 2);

export function calculateContributionAmount(salary: number, percentage: number) {
  const salaryCents = Math.round(Number(`${roundMoney(salary)}e2`));
  const percentageHundredths = Math.round(Number(`${roundPercentage(percentage)}e2`));
  const amountCents = Math.floor((salaryCents * percentageHundredths + 5_000) / 10_000);
  return amountCents / 100;
}
