import { describe, expect, it } from "vitest";
import { apiErrorMessage, errorMessage, httpErrorMessage } from "./error-messages";
import { ApiError, problemCode, validationErrors } from "./errors";

describe("problemCode", () => {
  it("reads errorCode and falls back to the deprecated legacy alias", () => {
    expect(problemCode({ errorCode: "ACCESS_DENIED" })).toBe("ACCESS_DENIED");
    expect(problemCode({ error: "free_plan_limits_exceeded" })).toBe("FREE_PLAN_LIMITS_EXCEEDED");
    expect(problemCode({ error: "A human readable sentence." })).toBe("");
    expect(problemCode(null)).toBe("");
  });
});

describe("validationErrors", () => {
  it("normalizes field dictionaries and legacy arrays", () => {
    expect(validationErrors({ errors: { email: ["bad"], name: "required" } })).toEqual({ email: ["bad"], name: ["required"] });
    expect(validationErrors({ errors: ["first", " "] })).toEqual({ request: ["first"] });
    expect(validationErrors({})).toEqual({});
  });
});

describe("apiErrorMessage", () => {
  it("uses Hebrew backend detail, but not generic English defaults", () => {
    expect(apiErrorMessage(409, { detail: "הדיווח כבר נשלח." })).toBe("הדיווח כבר נשלח.");
    expect(apiErrorMessage(404, { detail: "The requested resource was not found." })).toBe("הפריט המבוקש לא נמצא.");
  });

  it("never shows machine codes as prose", () => {
    expect(apiErrorMessage(400, { error: "report_not_editable" }, "נכשל")).toBe("נכשל");
  });

  it("falls back by status", () => {
    expect(apiErrorMessage(403, {})).toBe("אין לכם הרשאה לבצע פעולה זו.");
    expect(apiErrorMessage(503, null)).toBe("אירעה תקלה במערכת. נסו שוב מאוחר יותר.");
  });
});

describe("httpErrorMessage", () => {
  it("treats 401 as session expiry", () => {
    expect(httpErrorMessage(401, { detail: "x" })).toBe("פג תוקף החיבור. יש להתחבר מחדש.");
  });

  it("applies payment gate wording before backend detail", () => {
    expect(httpErrorMessage(409, { errorCode: "BANK_MANDATE_REQUIRED", detail: "mandate missing" }))
      .toBe("לא ניתן לשלוח את הדיווח ללא הרשאה פעילה לחיוב חשבון הבנק שנבחר.");
  });
});

describe("errorMessage", () => {
  it("shows API errors as given", () => {
    expect(errorMessage(new ApiError("http", 409, "הפריט כבר קיים במערכת."), "נכשל")).toBe("הפריט כבר קיים במערכת.");
  });

  it("shows Hebrew messages the app throws itself", () => {
    expect(errorMessage(new Error("יש לבחור קובץ."), "נכשל")).toBe("יש לבחור קובץ.");
  });

  it("never shows runtime or English library errors", () => {
    expect(errorMessage(new TypeError("Cannot read properties of undefined (reading 'id')"), "נכשל")).toBe("נכשל");
    expect(errorMessage(new SyntaxError("Unexpected token < in JSON"), "נכשל")).toBe("נכשל");
    expect(errorMessage(new Error("Unsupported file"), "נכשל")).toBe("נכשל");
    expect(errorMessage("boom", "נכשל")).toBe("נכשל");
  });
});
