import type { ReactNode } from "react";

type InputProps = {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  type?: "text" | "number";
};

export function AdminInput({ label, name, placeholder, defaultValue, type = "text" }: InputProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
};

export function AdminSelect({ label, name, defaultValue, value, onValueChange, options }: SelectProps) {
  const selectValueProps = value === undefined ? { defaultValue } : { value };

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        {...selectValueProps}
        onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-slate-500 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type TextAreaProps = {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
};

export function AdminTextArea({ label, name, placeholder, defaultValue }: TextAreaProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        rows={4}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}

type SectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AdminFormSection({ title, description, children }: SectionProps) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
