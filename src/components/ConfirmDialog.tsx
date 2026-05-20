// src/components/ConfirmDialog.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen, title, message, confirmLabel = "削除する", onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-5">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.90, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.90, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="relative w-full max-w-xs bg-white rounded-3xl shadow-2xl p-7"
          >
            <div className="flex justify-center mb-5">
              <div className="bg-red-50 p-4 rounded-2xl">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
            </div>

            <h3 className="text-center font-black text-slate-800 text-[15px] mb-1.5">{title}</h3>
            <p className="text-center text-xs font-bold text-slate-400 mb-7 leading-relaxed">{message}</p>

            <div className="flex gap-3">
              <button onClick={onCancel}
                className="flex-1 py-3.5 rounded-2xl font-black text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all">
                キャンセル
              </button>
              <button onClick={onConfirm}
                className="flex-1 py-3.5 rounded-2xl font-black text-sm text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-100">
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
