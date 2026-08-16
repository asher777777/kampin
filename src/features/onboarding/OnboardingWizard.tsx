"use client";

import { useReducer } from "react";
import { SquishyButton } from "@/components/motion/SquishyButton";
import { motion, AnimatePresence } from "framer-motion";

type State = {
  step: 1 | 2 | 3;
  formData: {
    name: string;
    preferences: string[];
    notifications: boolean;
  };
};

type Action =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_NAME"; payload: string }
  | { type: "TOGGLE_PREFERENCE"; payload: string }
  | { type: "TOGGLE_NOTIFICATIONS" };

const initialState: State = {
  step: 1,
  formData: {
    name: "",
    preferences: [],
    notifications: false,
  },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "NEXT_STEP":
      return { ...state, step: Math.min(state.step + 1, 3) as any };
    case "PREV_STEP":
      return { ...state, step: Math.max(state.step - 1, 1) as any };
    case "SET_NAME":
      return { ...state, formData: { ...state.formData, name: action.payload } };
    case "TOGGLE_PREFERENCE":
      const preferences = state.formData.preferences.includes(action.payload)
        ? state.formData.preferences.filter((p) => p !== action.payload)
        : [...state.formData.preferences, action.payload];
      return { ...state, formData: { ...state.formData, preferences } };
    case "TOGGLE_NOTIFICATIONS":
      return { ...state, formData: { ...state.formData, notifications: !state.formData.notifications } };
    default:
      return state;
  }
}

export function OnboardingWizard() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div className="max-w-md mx-auto p-8 bg-card border rounded-2xl shadow-xl overflow-hidden">
      <div className="flex justify-between mb-8">
        {[1, 2, 3].map((s: any) => (
          <div
            key={s}
            className={`w-1/3 h-1 rounded-full transition-colors ${
              s <= state.step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={state.step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {state.step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Welcome!</h2>
              <p className="text-muted-foreground">Let's start with your name.</p>
              <input
                value={state.formData.name}
                onChange={(e) => dispatch({ type: "SET_NAME", payload: e.target.value })}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-muted rounded-xl border focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          )}

          {state.step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Preferences</h2>
              <p className="text-muted-foreground">What are you interested in?</p>
              <div className="flex flex-wrap gap-2">
                {["Design", "Code", "Marketing", "Business"].map((p: any) => (
                  <button
                    key={p}
                    onClick={() => dispatch({ type: "TOGGLE_PREFERENCE", payload: p })}
                    className={`px-4 py-2 rounded-full border transition-all ${
                      state.formData.preferences.includes(p)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:border-primary"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Final Touch</h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.formData.notifications}
                  onChange={() => dispatch({ type: "TOGGLE_NOTIFICATIONS" })}
                  className="w-5 h-5 accent-primary"
                />
                <span>Enable push notifications</span>
              </label>
              <div className="p-4 bg-muted/50 rounded-xl text-sm">
                <pre>{JSON.stringify(state.formData, null, 2)}</pre>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex gap-4">
        {state.step > 1 && (
          <button
            onClick={() => dispatch({ type: "PREV_STEP" })}
            className="flex-1 px-4 py-3 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
        )}
        <SquishyButton
          onClick={() => {
            if (state.step < 3) dispatch({ type: "NEXT_STEP" });
            else alert("Onboarding complete!");
          }}
          className="flex-1"
        >
          {state.step === 3 ? "Complete" : "Continue"}
        </SquishyButton>
      </div>
    </div>
  );
}
