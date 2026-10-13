import { describe, expect, it } from "vitest";
import { employerSchema } from "./schemas";

const valid = {
  legalName: "  אלפא בע״מ ",
  registrationNumber: "514123456",
  withholdingFileNumber: "934567890",
  contactFirstName: "דנה",
  contactLastName: "כהן",
  contactPhone: "",
  contactMobile: "052-1234567",
  contactEmail: "dana@example.com",
};

function messages(input: Record<string, string>) {
  const result = employerSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("employerSchema", () => {
  it("normalizes valid input (trims text, strips non-digits from phones)", () => {
    expect(employerSchema.parse(valid)).toMatchObject({ legalName: "אלפא בע״מ", contactMobile: "0521234567", contactPhone: "" });
  });

  it("keeps the existing Hebrew field rules", () => {
    expect(messages({ ...valid, legalName: "א" })).toEqual({ legalName: "שם משפטי מלא הוא שדה חובה ולפחות 2 תווים." });
    expect(messages({ ...valid, registrationNumber: "123" })).toEqual({ registrationNumber: "מספר חברה / עוסק חייב להכיל 5-15 ספרות." });
    expect(messages({ ...valid, withholdingFileNumber: "1234567890" })).toEqual({ withholdingFileNumber: "מספר תיק ניכויים חייב להכיל 5-9 ספרות. במידה ואין, יש להזין 900000000." });
    expect(messages({ ...valid, contactEmail: "not-an-email" })).toEqual({ contactEmail: "כתובת האימייל של איש הקשר אינה תקינה." });
  });

  it("requires a phone or a mobile, and validates each when present", () => {
    expect(messages({ ...valid, contactMobile: "" })).toEqual({
      contactPhone: "יש להזין לפחות טלפון או נייד אחד.",
      contactMobile: "יש להזין לפחות טלפון או נייד אחד.",
    });
    expect(messages({ ...valid, contactPhone: "123", contactMobile: "0612345678" })).toEqual({
      contactPhone: "טלפון איש הקשר חייב להכיל 9–11 ספרות.",
      contactMobile: "מספר הנייד חייב להכיל 10 ספרות ולהתחיל ב־05.",
    });
  });
});
