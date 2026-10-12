import { Check } from "lucide-react";
import { getPasswordChecks } from "../lib/password";

type PasswordRequirementsProps = {
  password: string;
  // When the screen has a "repeat the password" field, also show whether both match.
  confirmation?: string;
};

export function PasswordRequirements({ password, confirmation }: PasswordRequirementsProps) {
  const checks = getPasswordChecks(password);

  if (confirmation !== undefined) {
    checks.push({ label: "As duas senhas são iguais", isMet: confirmation.length > 0 && confirmation === password });
  }

  return (
    <ul className="grid gap-2" aria-label="Requisitos da senha">
      {checks.map((check) => (
        <li
          key={check.label}
          className={`flex items-center gap-2 text-sm ${check.isMet ? "text-tinta" : "text-tinta-suave"}`}
        >
          <span
            aria-hidden
            className={`grid size-[18px] place-items-center rounded-full ${check.isMet ? "bg-verde text-superficie" : "ring-[1.5px] ring-linha ring-inset"}`}
          >
            {check.isMet && <Check size={12} strokeWidth={3} />}
          </span>
          {check.label}
          <span className="sr-only">{check.isMet ? "(atendido)" : "(pendente)"}</span>
        </li>
      ))}
    </ul>
  );
}
