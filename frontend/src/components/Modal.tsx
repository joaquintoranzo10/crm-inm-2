import type { ReactNode } from "react";
import { useEffect } from "react";
import clsx from "clsx";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
};

  

export default function Modal({ open, title, onClose, children, maxWidth = "md" }: ModalProps) {
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
      {/* Backdrop*/}
      <div className="rc-modal-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={clsx("rc-modal-panel", "w-full overflow-hidden",
            maxWidth === "sm" && "max-w-sm",
            maxWidth === "md" && "max-w-lg",
            maxWidth === "lg" && "max-w-2xl"
          )}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-3 border-b" style={{ borderColor: "var(--modal-panel-border)" }}>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>

          {/* Body */}
          <div className="p-5 ">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}