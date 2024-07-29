import { createContext, useCallback, useContext, useState } from "react";

export interface Toast {
  id: string;
  message: string;
  variant: "success" | "danger";
  autohide?: boolean;
}

export interface UseToasts {
  toasts: Toast[];
  addToast: (params: AddToastParams) => void;
  removeToast: (id: string) => void;
}

type AddToastParams = {
  message: string;
  variant: "success" | "danger";
  autohide?: boolean;
};

export const ToastsContext = createContext<UseToasts>({} as UseToasts);

export default function useToasts(): UseToasts {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    ({ message, variant, autohide = true }: AddToastParams) => {
      const id = window.crypto.randomUUID();
      setToasts((oldToasts) => [
        ...oldToasts,
        { id, message, variant, autohide },
      ]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((oldToasts) => oldToasts.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export function useToastsContext(): UseToasts {
  return useContext(ToastsContext);
}
