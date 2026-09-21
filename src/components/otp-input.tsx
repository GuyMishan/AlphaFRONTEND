"use client";

import { UiInput } from "@/components/ui-controls";
import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from "react";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function OtpInput({ value, onChange, onComplete, disabled = false, autoFocus = true }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function updateDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    const nextValue = next.join("");
    onChange(nextValue);

    if (digit && index < 5) refs.current[index + 1]?.focus();
    if (digit && index === 5 && /^\d{6}$/.test(nextValue)) onComplete(nextValue);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index < 5) refs.current[index + 1]?.focus();
    if (event.key === "ArrowRight" && index > 0) refs.current[index - 1]?.focus();
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, 6) - 1]?.focus();
    if (pasted.length === 6) onComplete(pasted);
  }

  return (
    <div className="otp-inputs otp-inputs-row" dir="ltr" aria-label="קוד אימות בן 6 ספרות">
      {digits.map((digit, index) => (
        <UiInput
          key={index}
          ref={(element) => { refs.current[index] = element; }}
          className="otp-digit otp-digit-box"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`ספרה ${index + 1} מתוך 6`}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}
