import type { ReactNode } from "react";
import {useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
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
  }
  
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

  
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full ${maxWidth} rc-modal-panel flex flex-col max-h-[90vh]`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b rc-border shrink-0">
          {title && <h3 className="text-lg font-black tracking-tight">{title}</h3>}
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 opacity-70" />
          </button>
        </div>
        
        {/* Contenido */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}