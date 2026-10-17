// Error or success line inside a settings dialog.
export function FormFeedback({ errorMessage, successMessage, className = "" }: { errorMessage: string; successMessage?: string; className?: string }) {
  if (!errorMessage && !successMessage) return null;

  return (
    <p
      role={errorMessage ? "alert" : "status"}
      className={`rounded-field px-4 py-3 text-sm font-medium ${errorMessage ? "bg-vermelho-suave text-vermelho" : "bg-verde-suave text-verde-tinta"} ${className}`}
    >
      {errorMessage || successMessage}
    </p>
  );
}
