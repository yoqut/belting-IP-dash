"use client";

import { memo } from "react";

interface IconButtonProps {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  spinning?: boolean;
  children: React.ReactNode;
}

/** Header'dagi kvadrat ikonka tugmalari (refresh, export, sozlamalar). */
export const IconButton = memo(function IconButton({
  onClick, title, disabled, active, spinning, children,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-2 border rounded-md transition-colors disabled:opacity-40 ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
      }`}
    >
      <span className={spinning ? "block animate-spin" : "block"}>{children}</span>
    </button>
  );
});

interface RadioOptionProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/** Filter drawer'dagi radio ko'rinishidagi tanlov. */
export const RadioOption = memo(function RadioOption({ label, active, onClick }: RadioOptionProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm text-left transition-colors ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-blue-300"
      }`}
    >
      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
        active ? "border-white" : "border-gray-300 dark:border-slate-500"
      }`}>
        {active && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  );
});

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}

export const SearchInput = memo(function SearchInput({
  value, onChange, placeholder, className = "",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-500 pointer-events-none"
        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
      >
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
      />
    </div>
  );
});

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}

/** Chevron ikonkasi bilan bir xil ko'rinishdagi `<select>`. */
export const Select = memo(function Select({ value, onChange, children, className = "" }: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      >
        {children}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
      >
        <path d="M19 9l-7 7-7-7" strokeLinecap="round" />
      </svg>
    </div>
  );
});
