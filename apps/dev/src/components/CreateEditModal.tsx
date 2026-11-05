"use client";

import { X, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

export interface Field {
  key: string;
  label: string;
  type?: "text" | "select" | "searchable-select" | "textarea" | "boolean";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
}

interface CreateEditModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onSubmit: () => void;
  loading?: boolean;
  error?: string | null;
  submitLabel?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  required,
}: {
  value: string;
  onChange: (val: string) => void;
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOpt = options.find((o) => o.value === value);
  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white text-left focus:outline-none focus:ring-2 focus:ring-amber-500/40"
      >
        <span
          className={selectedOpt ? "text-white font-medium truncate" : "text-slate-500 truncate"}
        >
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-800 sticky top-0 bg-slate-900">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to filter…"
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
            <div className="overflow-y-auto max-h-52 p-1 space-y-0.5">
              {!required && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    !value
                      ? "bg-amber-500/20 text-amber-300 font-bold"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  None / Not Assigned
                </button>
              )}
              {filtered.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">No matching options</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      opt.value === value
                        ? "bg-amber-500/20 text-amber-300 font-bold"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function CreateEditModal({
  open,
  onClose,
  title,
  fields,
  values,
  onChange,
  onSubmit,
  loading = false,
  error,
  submitLabel = "Save",
}: CreateEditModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {fields.map((field) => {
            const isSearchable =
              field.type === "searchable-select" ||
              (field.type === "select" && (field.options?.length ?? 0) > 8);

            return (
              <div key={field.key}>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  {field.label}
                  {field.required && <span className="text-amber-400 ml-0.5">*</span>}
                </label>

                {isSearchable ? (
                  <SearchableSelect
                    value={String(values[field.key] ?? "")}
                    onChange={(val) => onChange(field.key, val)}
                    options={field.options}
                    placeholder={field.placeholder ?? `Select ${field.label}…`}
                    required={field.required}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={String(values[field.key] ?? "")}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="">Select…</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={String(values[field.key] ?? "")}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    rows={3}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                ) : field.type === "boolean" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={field.key}
                      checked={Boolean(values[field.key])}
                      onChange={(e) => onChange(field.key, e.target.checked)}
                      className="h-4 w-4 accent-amber-500"
                    />
                    <label htmlFor={field.key} className="text-xs text-slate-300">
                      {values[field.key] ? "Yes" : "No"}
                    </label>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={String(values[field.key] ?? "")}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                )}
              </div>
            );
          })}

          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors"
          >
            {loading ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
