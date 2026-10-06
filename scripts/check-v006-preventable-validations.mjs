import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const editor = read("src/components/pension-products-editor.tsx");
const deposits = read("src/components/manual-deposit-data.tsx");
const reports = read("src/app/reports/page.tsx");
const api = read("src/lib/manual-deposits-api.ts");

const requireText = (source, text, label) => {
  if (!source.includes(text)) {
    throw new Error(`V006 guard failed: ${label} is missing '${text}'`);
  }
};

// Rules known before the deposit-status step.
requireText(editor, "currentIsraelMonth()", "future salary-month validation");
requireText(editor, "קוד שגיאה 27", "error 27");
requireText(editor, "קוד שגיאה 28/43", "draft duplicate 28/43");
requireText(editor, "if (!usesEmployeeEmployerRegulation19) continue;", "report-stage deferral of status-dependent Regulation 19 rules");

// Rules whose correctness depends on the official deposit status belong in Deposits.
requireText(deposits, "if (meta.depositStatus === 2) return errors;", "self-employed status exemption");
for (const code of [16, 17, 23, 53, 71, 72, 75]) {
  requireText(deposits, `קוד שגיאה ${code}`, `deposit-stage error ${code}`);
}
requireText(deposits, "noContributionEmployeeStatuses", "suppressed-contribution employee statuses");
requireText(deposits, "contributionLimits", "canonical contribution limits");

// Feedback/correction editing must use the same canonical limits.
requireText(api, "contributionLimits: ManualDepositContributionLimit[]", "deposit API contribution limits");
requireText(reports, "contributionLimits: page.contributionLimits", "feedback correction limit capture");
requireText(reports, "contributionLimits={editingDeposit.contributionLimits}", "feedback correction editor limits");

console.log("V006 preventable validation ownership guard passed.");
