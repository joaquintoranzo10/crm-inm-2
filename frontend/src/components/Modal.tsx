import type { ReactNode } from "react";
import clsx from "clsx";
import {useEffect, useRef } from "react";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: MaxWidth;
};

  

export default function Modal({ open, title, onClose, children, maxWidth = "md" }: ModalProps) {
  
  //Tamaños 
  const widthClasses: Record<MaxWidth, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "full": "max-w-full",
  };
  
  // Cierra con ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="rc-modal-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={clsx(
            "rc-modal-panel w-full overflow-hidden shadow-2xl rounded-xl transform transition-all", 
            widthClasses[maxWidth]
          )}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b rc-border flex justify-between items-center bg-[var(--surface)]">
            <h3 className="text-lg font-semibold text-[var(--base-clr)]">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">✕</button>
          </div>

          <div className="p-5 max-h-[85vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}