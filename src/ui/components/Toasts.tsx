import { PropsWithChildren } from "react";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";

import { ToastsContext, UseToasts, useToastsContext } from "../hooks/useToasts";

function Toasts() {
  const { toasts, removeToast } = useToastsContext();

  return (
    <ToastContainer position="top-end" className="p-3 position-fixed">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          bg={toast.variant}
          onClose={() => removeToast(toast.id)}
          autohide={!toast.autohide}
          delay={3500}
        >
          <Toast.Header closeButton></Toast.Header>
          <Toast.Body className="fs-6 p-3">{toast.message}</Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}

function ToastProvider({
  context,
  children,
}: PropsWithChildren<{ context: UseToasts }>) {
  return (
    <ToastsContext.Provider value={context}>{children}</ToastsContext.Provider>
  );
}

export default Object.assign(Toasts, {
  Provider: ToastProvider,
});
