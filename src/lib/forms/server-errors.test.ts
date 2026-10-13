import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { applyServerErrors } from "./server-errors";

type Values = { legalName: string; contactEmail: string };

describe("applyServerErrors", () => {
  it("maps backend field keys case-insensitively and focuses the first", () => {
    const setError = vi.fn();
    const error = new ApiError("http", 400, "x", {
      errorCode: "VALIDATION_FAILED",
      errors: { LegalName: ["שם חסר"], ContactEmail: ["אימייל תפוס"], request: ["כללי"] },
    });

    const applied = applyServerErrors<Values>(error, ["legalName", "contactEmail"], setError);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledWith("legalName", { type: "server", message: "שם חסר" }, { shouldFocus: true });
    expect(setError).toHaveBeenCalledWith("contactEmail", { type: "server", message: "אימייל תפוס" }, { shouldFocus: false });
    expect(setError).toHaveBeenCalledTimes(2);
  });

  it("supports aliases and ignores non-API errors", () => {
    const setError = vi.fn();
    const error = new ApiError("http", 400, "x", { errors: { "contact.email": ["bad"] } });

    expect(applyServerErrors<Values>(error, ["legalName", "contactEmail"], setError, { "contact.email": "contactEmail" })).toBe(true);
    expect(applyServerErrors<Values>(new Error("boom"), ["legalName"], setError)).toBe(false);
  });
});
