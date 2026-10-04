import { getPasswordChecks } from "../lib/password";

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="grid gap-1.5" aria-label="Requisitos da senha">
      {getPasswordChecks(password).map((check) => (
        <li
          key={check.label}
          className={`flex items-center gap-2 text-xs font-bold ${
            check.isMet ? "text-[#16A34A]" : "text-[#6B7280]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex size-4 items-center justify-center rounded-full text-[10px] ${
              check.isMet ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F3F4F6] text-[#9CA3AF]"
            }`}
          >
            {check.isMet ? "✓" : "•"}
          </span>
          {check.label}
          <span className="sr-only">{check.isMet ? "(atendido)" : "(pendente)"}</span>
        </li>
      ))}
    </ul>
  );
}
