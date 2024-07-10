import { createContext, useCallback, useContext, useState } from "react";

export interface Toast {
  id: string;
  message: string;
  variant: "success" | "danger";
}

export interface UseToasts {
  toasts: Toast[];
  addToast: (message: string, variant: "success" | "danger") => void;
}

export const ToastsContext = createContext<UseToasts>({} as UseToasts);

export default function useToasts(): UseToasts {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, variant: "success" | "danger") => {
      const id = window.crypto.randomUUID();
      setToasts((oldToasts) => [...oldToasts, { id, message, variant }]);
      setTimeout(() => {
        setToasts((oldToasts) => oldToasts.filter((toast) => toast.id !== id));
      }, 3500);
    },
    [],
  );

  return { toasts, addToast };
}

export function useToastsContext(): UseToasts {
  return useContext(ToastsContext);
}
