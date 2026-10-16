"use client";

import { useFormStatus } from "react-dom";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pendingText?: string;
  variant?: "primary" | "dark" | "outline" | "ghost" | "danger";
  size?: "md" | "sm";
  /** If set, asks the user to confirm before submitting (for destructive actions). */
  confirmMessage?: string;
}

export function SubmitButton({ children, pendingText, variant = "primary", size = "md", confirmMessage, className, onClick, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...rest}
      className={`btn btn-${variant}${size === "sm" ? " btn-sm" : ""}${className ? " " + className : ""}`}
      disabled={pending || rest.disabled}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {pending ? pendingText ?? "Working…" : children}
    </button>
  );
}
