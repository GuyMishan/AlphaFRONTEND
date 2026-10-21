import { describe, expect, it } from "vitest";
import { documentFocusFromFields } from "./document-focus";

describe("database-owned feedback document focus", () => {
  it.each([3, 4, 5, 6])("accepts known document type %i", type => {
    expect(documentFocusFromFields(JSON.stringify({ documentTypeCode: type }))).toBe(type);
  });

  it.each(["[]", "{}", "", "invalid json", '{"documentTypeCode": "6"}', '{"documentTypeCode": 999}', "null", "6"])(
    "does not infer an upload from invalid or ambiguous fields %s", value => {
      expect(documentFocusFromFields(value)).toBe(0);
    },
  );

  it("does not infer a target when no DB mapping exists", () => {
    expect(documentFocusFromFields(undefined)).toBe(0);
  });
});
