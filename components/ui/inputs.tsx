'use client';

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';

/* ---------------------------------- Field --------------------------------- */

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-base" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-fog-faint">{hint}</p> : null}
    </div>
  );
}

/* ---------------------------------- Input --------------------------------- */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', invalid = false, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`input-base ${invalid ? 'border-red-500/60 focus:border-red-500/70 focus:ring-red-500/25' : ''} ${className}`}
      {...rest}
    />
  );
});

/* ----------------------------- Password input ----------------------------- */

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  function PasswordInput({ className = '', ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`pr-10 ${className}`}
          {...rest}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-fog-faint transition hover:text-neon-300"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);

/* ---------------------------------- Select -------------------------------- */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className = '', ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`input-base appearance-none pr-8 ${className}`} {...rest}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

/* --------------------------------- Textarea ------------------------------- */

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', ...rest }, ref) {
  return <textarea ref={ref} className={`input-base resize-y ${className}`} {...rest} />;
});

/* --------------------------------- Checkbox ------------------------------- */

export function Checkbox({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id?: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label
      htmlFor={inputId}
      className={`flex items-center gap-2.5 text-sm text-fog ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-ink-400 bg-ink-900 accent-neon-500 outline-none focus-visible:ring-2 focus-visible:ring-neon-500/40"
      />
      {label}
    </label>
  );
}
