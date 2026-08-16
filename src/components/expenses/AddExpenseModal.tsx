import { useState, useRef } from "react";
import { X, Folder, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExpenseForm } from "./ExpenseForm";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseTypes: string[];
  paymentMethods: string[];
  onSubmit: (data: any) => Promise<{ success: boolean; id?: any; error?: any } | void>;
  onAddOption: (type: "expenseType" | "paymentMethod", value: string) => Promise<{ success: boolean; error?: any } | void>;
}

export function AddExpenseModal({ isOpen, onClose, expenseTypes, paymentMethods, onSubmit, onAddOption }: AddExpenseModalProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  const handleCloseClick = () => {
    if (isDirty) {
      setShowWarning(true);
    } else {
      onClose();
    }
  };

  const handleSaveClick = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const handleFormSubmit = async (data: any) => {
    const res = await onSubmit(data);
    if (res && res.success) {
      setIsDirty(false); // reset so it can close without warning
      onClose();
    }
    return res;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-black w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col overflow-hidden relative border border-amber-500/50"
        >
          {/* Header */}
          <div className="p-6 text-center relative z-10 border-b border-amber-500/20 bg-black">
            <h2 className="text-xl font-black text-amber-500 tracking-wider">הוספת הוצאה חדשה</h2>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
            <ExpenseForm 
              expenseTypes={expenseTypes}
              paymentMethods={paymentMethods}
              onSubmit={handleFormSubmit}
              onAddOption={onAddOption}
              hideSubmitButton={true}
              formRef={formRef}
              onDirtyChange={setIsDirty}
            />
          </div>

          {/* Footer Actions */}
          <div className="border-t border-amber-500/20 p-6 flex items-center justify-center gap-8 rounded-b-[2rem] relative z-10 bg-black">
            <button
              onClick={handleSaveClick}
              className="group flex flex-col items-center justify-center gap-2 hover:scale-110 transition-all duration-300"
            >
              <div className="w-20 h-20 rounded-full border-2 border-amber-500 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] group-hover:bg-amber-500/20 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                <Folder className="w-10 h-10 text-amber-500" />
              </div>
            </button>

            <button
              onClick={handleCloseClick}
              className="group flex flex-col items-center justify-center gap-2 hover:scale-110 transition-all duration-300"
            >
              <div className="w-20 h-20 rounded-full border-2 border-white/30 text-white flex items-center justify-center shadow-lg hover:border-white hover:bg-white/10">
                <X className="w-10 h-10" />
              </div>
            </button>
          </div>

          {/* Warning Dialog */}
          <AnimatePresence>
            {showWarning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
              >
                <div className="bg-black rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] border border-amber-500/50 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-amber-500 mb-4 border border-amber-500/30 bg-amber-500/10">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-white">השינויים לא נשמרו!</h3>
                  <p className="text-slate-300 font-medium leading-relaxed">
                    מיכאל מחכה לך. אם תצא כעת, כל השינויים יאבדו. האם אתה בטוח שברצונך לצאת?
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button
                      onClick={() => setShowWarning(false)}
                      className="px-6 py-3 rounded-xl border border-amber-500/50 text-amber-500 hover:bg-amber-500/10 font-bold transition-colors"
                    >
                      חזור לעריכה
                    </button>
                    <button
                      onClick={() => {
                        setShowWarning(false);
                        setIsDirty(false);
                        onClose();
                      }}
                      className="px-6 py-3 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-500/30 transition-all"
                    >
                      כן, צא
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
