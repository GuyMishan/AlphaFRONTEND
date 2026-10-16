"use client";

import { FileCode2, FilePenLine, FileSpreadsheet, Keyboard, RotateCcw } from "lucide-react";
import { UiChoiceCard, UiDateInput } from "@/components/ui/ui-controls";
import type { ManualReportKind, SourceManualReport } from "../../types";
import type { IntakeMode } from "../../new-report-options";
import { SourceReportsList } from "./source-reports-list";

type Props = {
  reportKind: ManualReportKind;
  setReportKind: (value: ManualReportKind) => void;
  selectingExisting: boolean;
  onSelectExisting: () => void;
  mode: IntakeMode;
  setMode: (value: IntakeMode) => void;
  correctionOperationCode: 2 | 3;
  setCorrectionOperationCode: (value: 2 | 3) => void;
  month: string;
  setMonth: (value: string) => void;
  salaryPaymentDate: string;
  setSalaryPaymentDate: (value: string) => void;
  showValidation: boolean;
  sourceReports: SourceManualReport[];
  sourceSearch: string;
  setSourceSearch: (value: string) => void;
  sourceHasMore: boolean;
  loadingSources: boolean;
  selectedSourceReportId: string;
  chooseSource: (report: SourceManualReport) => void;
  searchSources: () => void;
  loadMoreSources: () => void;
};

const kindChoices: { value: ManualReportKind; icon: typeof Keyboard; title: string; text: string }[] = [
  { value: 1, icon: Keyboard, title: "דיווח שוטף", text: "הדיווח החודשי הרגיל עבור תקופת השכר שנבחרה" },
  { value: 2, icon: FilePenLine, title: "דיווח הפרשים", text: "דיווח המשלים סכומים ביחס לדיווח קודם" },
  { value: 3, icon: FilePenLine, title: "דיווח שלילי", text: "הפחתה או ביטול של נתונים שכבר דווחו בדיווח קודם" },
];

const intakeChoices: { value: IntakeMode; icon: typeof Keyboard; title: string; text: string }[] = [
  { value: "manual", icon: Keyboard, title: "דיווח ידני", text: "בחירת עובדים והזנת המוצרים וההפקדות במערכת" },
  { value: "excel", icon: FileSpreadsheet, title: "קובץ Excel", text: "העלאת קובץ דיווח מלא: עובדים, מוצרים, הפרשות ונתוני ממשק 006" },
  { value: "xml", icon: FileCode2, title: "XML ממשק מעסיקים", text: "העלאת קובץ ממשק מעסיקים 006, בדיקת המבנה וקליטת הדיווח" },
  { value: "correction", icon: FilePenLine, title: "תיקון אחרי שלילי 6", text: "יצירת דיווח שוטף מתקן פעולה 2 או 3 על בסיס דיווח שלילי שביטל את התנועה" },
];

function ReportDates({ month, setMonth, salaryPaymentDate, setSalaryPaymentDate, showValidation, disabledMonth = false }: Pick<Props,
  "month" | "setMonth" | "salaryPaymentDate" | "setSalaryPaymentDate" | "showValidation"
> & { disabledMonth?: boolean }) {
  const invalid = showValidation && !salaryPaymentDate;
  return <div className="grid two-cols" style={{ marginBlock: 24 }}>
    <div className="field">
      <label htmlFor="report-month">חודש דיווח *</label>
      <UiDateInput id="report-month" mode="month" value={month} onValueChange={setMonth} required disabled={disabledMonth} />
    </div>
    <div className={`field${invalid ? " field-error" : ""}`}>
      <label htmlFor="salary-date">תאריך תשלום שכר *</label>
      <UiDateInput id="salary-date" value={salaryPaymentDate} onValueChange={setSalaryPaymentDate} required aria-invalid={invalid} />
      {invalid ? <small className="field-error-text">תאריך תשלום שכר הוא שדה חובה.</small> : null}
    </div>
  </div>;
}

export function ReportDetails(props: Props) {
  const {
    reportKind, setReportKind, selectingExisting, onSelectExisting, mode, setMode,
    correctionOperationCode, setCorrectionOperationCode, sourceReports, loadingSources,
  } = props;
  const sources = <SourceReportsList
    reports={sourceReports} loading={loadingSources} selectedId={props.selectedSourceReportId}
    search={props.sourceSearch} setSearch={props.setSourceSearch} chooseSource={props.chooseSource}
    onSearch={props.searchSources} hasMore={props.sourceHasMore} onLoadMore={props.loadMoreSources}
  />;

  return <>
    <div className="card-head">
      <div>
        <h2>סוג הדיווח</h2>
        <span style={{ color: "var(--color-text-muted)" }}>בחרו קודם מה מטרת הדיווח. הבחירה תישאר מוצגת לאורך כל התהליך.</span>
      </div>
    </div>
    <div className="grid choice-grid" style={{ marginBottom: 24 }}>
      {kindChoices.map(({ value, icon: Icon, title, text }) => <UiChoiceCard
        key={value} selected={!selectingExisting && reportKind === value} onClick={() => setReportKind(value)}>
        <Icon className="choice-icon" size={28} /><b>{title}</b><p>{text}</p>
      </UiChoiceCard>)}
      <UiChoiceCard selected={selectingExisting} onClick={onSelectExisting}>
        <RotateCcw className="choice-icon" size={28} /><b>המשך דיווח קיים</b>
        <p>בחירת טיוטה שנשמרה וחזרה לעריכת עובדים והפקדות</p>
      </UiChoiceCard>
    </div>
    {selectingExisting ? null : reportKind === 1 ? <>
      <ReportDates {...props} />
      <div className="card-head"><h3 style={{ margin: 0 }}>אופן קליטת הנתונים</h3></div>
      <div className="grid choice-grid">
        {intakeChoices.map(({ value, icon: Icon, title, text }) => <UiChoiceCard
          key={value} selected={mode === value} onClick={() => setMode(value)}>
          <Icon className="choice-icon" size={28} /><b>{title}</b><p>{text}</p>
        </UiChoiceCard>)}
      </div>
      {mode === "correction" ? <div style={{ marginTop: 24 }}>
        <div className="notice notice-info" style={{ marginBottom: 18 }}>
          לפי ממשק מעסיקים 006, פעולה 2/3 חייבת להפנות לדיווח השלילי קוד 6 שקדם לה. מוצגים כאן רק דיווחים כשירים.
        </div>
        <div className="grid choice-grid" style={{ marginBottom: 18 }}>
          <UiChoiceCard selected={correctionOperationCode === 2} onClick={() => setCorrectionOperationCode(2)}>
            <b>פעולה 2</b><p>תיקון נתונים ללא הפקדה נוספת</p>
          </UiChoiceCard>
          <UiChoiceCard selected={correctionOperationCode === 3} onClick={() => setCorrectionOperationCode(3)}>
            <b>פעולה 3</b><p>תיקון נתונים עם הפקדה נוספת בפועל</p>
          </UiChoiceCard>
        </div>
        {sources}
        {!loadingSources && !sourceReports.length ? <div className="notice notice-info" style={{ marginTop: 12 }}>
          לא נמצא דיווח שלילי קוד 6 כשיר לתיקון שוטף.
        </div> : null}
      </div> : null}
    </> : <>
      <div className="notice" style={{ marginBottom: 18 }}>
        {reportKind === 3 ? "דיווח שלילי חייב להיות מקושר לדיווח שאותו הוא מפחית או מבטל."
          : "דיווח הפרשים חייב להיות מקושר לדיווח שעליו משלימים את ההפרשים."}
      </div>
      {sources}
      {props.selectedSourceReportId ? <ReportDates {...props} disabledMonth /> : null}
    </>}
  </>;
}
