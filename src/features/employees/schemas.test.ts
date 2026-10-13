import { describe, expect, it } from "vitest";
import { employeeSchema, type EmployeeFormValues } from "./schemas";

const valid: EmployeeFormValues = {
  identifierType: 1,
  nationalId: "123456782",
  firstName: " ישראל ",
  lastName: "ישראלי",
  employeeNumber: "EMP-1",
  startDate: "2024-01-01",
  monthlySalary: "",
  birthDate: "1990-05-05",
  gender: 1,
  email: "worker@example.com",
  mobile: "052-111-2233",
  city: "תל אביב",
  street: "הרצל",
  houseNumber: "10",
  apartment: "2",
  postalCode: "61000-00",
  postOfficeBox: "",
};

function errorPaths(input: EmployeeFormValues) {
  const result = employeeSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("employeeSchema", () => {
  it("normalizes the payload sent to the backend", () => {
    expect(employeeSchema.parse(valid)).toMatchObject({ firstName: "ישראל", monthlySalary: 0, mobile: "0521112233", postalCode: "6100000" });
  });

  it("validates the Israeli ID check digit, or passport format for identifier type 2", () => {
    expect(errorPaths({ ...valid, nationalId: "123456789" })).toEqual({ nationalId: "תעודת הזהות אינה תקינה." });
    expect(errorPaths({ ...valid, identifierType: 2, nationalId: "AB1234567" })).toEqual({});
    expect(errorPaths({ ...valid, identifierType: 2, nationalId: "" })).toEqual({ nationalId: "מספר הדרכון הוא שדה חובה ויכול להכיל עד 16 תווים ללא רווחים." });
  });

  it("reports field and cross-field errors together, as the previous form did", () => {
    expect(errorPaths({ ...valid, firstName: "", birthDate: null, gender: null, nationalId: "1", postalCode: "", postOfficeBox: "" })).toEqual({
      firstName: "שם פרטי הוא שדה חובה ולפחות 2 תווים.",
      birthDate: "תאריך לידה הוא שדה חובה.",
      gender: "מין העובד הוא שדה חובה.",
      nationalId: "תעודת הזהות אינה תקינה.",
      postOfficeBox: "יש להזין תא דואר או כתובת רחוב מלאה הכוללת מיקוד.",
    });
  });

  it("rejects unreasonable start dates and negative salaries", () => {
    expect(errorPaths({ ...valid, startDate: "1900-01-01" })).toEqual({ startDate: "תאריך תחילת העבודה אינו הגיוני." });
    expect(errorPaths({ ...valid, monthlySalary: -5 })).toEqual({ monthlySalary: "שכר חודשי לא יכול להיות שלילי." });
  });
});
