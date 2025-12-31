import { useEffect, useMemo, useRef, useState } from "react";
import data from "@/data/arg-geo.json"; 

type Option = {
  prov_id: string;
  prov: string;
  depto_id: string;
  depto: string;
  label: string;
  tokens: string;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function buildOptions(): Option[] {
  const out: Option[] = [];
  for (const p of data.provinces) {
    for (const d of p.departments) {
      const label = `${p.name}, ${d.name}`;
      out.push({
        prov_id: String(p.id),
        prov: p.name,
        depto_id: String(d.id),
        depto: d.name,
        label,
        tokens: norm(`${p.name} ${d.name} ${label}`),
      });
    }
  }
  return out;
}

const ALL_OPTIONS: Option[] = buildOptions();

type Props = {
  value: string;
  onChange: (v: string, meta?: { prov_id?: string; depto_id?: string }) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  minChars?: number;
  limit?: number;
  showOnEmpty?: boolean;
};

export default function SmartLocationCombo({
  value,
  onChange,
  placeholder = "Provincia, Departamento",
  required = false,
  className = "",
  minChars = 2,
  limit = 12,
  showOnEmpty = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => setQ(value || ""), [value]);

  const [raw, setRaw] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setRaw(q), 80);
    return () => clearTimeout(id);
  }, [q]);

  const canOpen = useMemo(() => {
    const len = norm(raw).length;
    return showOnEmpty || len >= minChars;
  }, [raw, minChars, showOnEmpty]);

  const results = useMemo(() => {
    const nq = norm(raw);
    if (!canOpen) return [];
    if (!nq) {
      return ALL_OPTIONS.slice(0, limit);
    }
    const starts: Option[] = [];
    const includes: Option[] = [];
    for (const opt of ALL_OPTIONS) {
      if (opt.tokens.includes(nq)) {
        if (opt.tokens.startsWith(nq) || opt.tokens.split(" ").some((w) => w.startsWith(nq))) {
          starts.push(opt);
        } else {
          includes.push(opt);
        }
      }
      if (starts.length + includes.length >= limit * 3) break;
    }
    return [...starts, ...includes].slice(0, limit);
  }, [raw, canOpen, limit]);

  useEffect(() => {
    setOpen(canOpen && results.length > 0);
    setActive(0);
  }, [canOpen, results.length]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function select(opt: Option) {
    onChange(opt.label, { prov_id: opt.prov_id, depto_id: opt.depto_id });
    setQ(opt.label);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (canOpen && results.length > 0) setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
      scrollActiveIntoView(Math.min(active + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
      scrollActiveIntoView(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = results[active];
      if (opt) select(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function scrollActiveIntoView(idx: number) {
    const ul = listRef.current;
    if (!ul) return;
    const li = ul.children[idx] as HTMLElement | undefined;
    if (!li) return;
    const liTop = li.offsetTop;
    const liBottom = liTop + li.offsetHeight;
    const viewTop = ul.scrollTop;
    const viewBottom = viewTop + ul.clientHeight;
    if (liTop < viewTop) ul.scrollTop = liTop;
    else if (liBottom > viewBottom) ul.scrollTop = liBottom - ul.clientHeight;
  }

   return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        value={q}
        onChange={(e) => {
          const v = e.target.value;
          setQ(v);
          onChange(v);
        }}
        onFocus={() => setOpen(canOpen && results.length > 0)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        className="rc-input mt-1 block transition-all"
      />

      {!showOnEmpty && norm(q).length > 0 && norm(q).length < minChars && (
        <div className="absolute left-0 top-full mt-1 text-xs text-gray-500 dark:text-gray-400">
          Escribí al menos {minChars} {minChars === 1 ? "carácter" : "caracteres"}…
        </div>
      )}

      {open && (

        <div className="absolute z-50 mt-1 w-full rounded-lg border shadow-lg overflow-hidden
             bg-white border-gray-200 
             dark:bg-zinc-900 dark:border-zinc-700">
          
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin coincidencias</div>
          ) : (
            <ul
              ref={listRef}
              className="py-1 max-h-[180px] overflow-y-auto"
              role="listbox"
              aria-label="Resultados de ubicación"
            >
              {results.map((opt, i) => (
                <li
                  key={`${opt.prov_id}-${opt.depto_id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(opt);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                    i === active
                      ? "bg-blue-600 text-white font-bold"
                      : "text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}