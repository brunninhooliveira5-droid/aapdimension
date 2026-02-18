import { createContext, useContext, useState, ReactNode } from "react";

interface CalculatorContextType {
  isOpen: boolean;
  openCalculator: () => void;
  closeCalculator: () => void;
  toggleCalculator: () => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <CalculatorContext.Provider
      value={{
        isOpen,
        openCalculator: () => setIsOpen(true),
        closeCalculator: () => setIsOpen(false),
        toggleCalculator: () => setIsOpen((v) => !v),
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error("useCalculator must be used within CalculatorProvider");
  return ctx;
}
