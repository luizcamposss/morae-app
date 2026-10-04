import { useState, type FormEvent } from "react";
import { PasswordRequirements } from "../../shared/components/PasswordRequirements";
import { isStrongPassword } from "../../shared/lib/password";
import { changePassword } from "./authService";

type ChangePasswordModalProps = {
  onClose: () => void;
};

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDone, setIsDone] = useState(false);

  const confirmationMatches = confirmation.length > 0 && confirmation === newPassword;
  const canSubmit =
    currentPassword.length > 0 && isStrongPassword(newPassword) && confirmationMatches && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await changePassword(currentPassword, newPassword);
      setIsDone(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputType = isPasswordVisible ? "text" : "password";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D2E]/30 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Senha e segurança"
        className="max-h-[calc(100vh-4rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-[#0B3D2E]/20"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-5">
          <h2 className="text-2xl font-black text-[#111827]">Senha e segurança</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-light text-[#6B7280] transition hover:bg-[#FDECEC] hover:text-[#B42318]"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-6 sm:px-8">
          {isDone ? (
            <div className="space-y-5">
              <div role="status" className="rounded-2xl border border-[#BBF7D0] bg-[#ECFDF5] px-4 py-3 text-sm font-bold leading-6 text-[#065F46]">
                Senha alterada. Por segurança, as sessões abertas em outros aparelhos foram encerradas;
                neste aparelho você continua conectado.
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E]"
              >
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <PasswordInput
                label="Senha atual"
                type={inputType}
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
              />
              <PasswordInput
                label="Nova senha"
                type={inputType}
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
              />
              <PasswordRequirements password={newPassword} />
              <PasswordInput
                label="Confirme a nova senha"
                type={inputType}
                value={confirmation}
                onChange={setConfirmation}
                autoComplete="new-password"
              />
              {confirmation.length > 0 && !confirmationMatches && (
                <p className="text-xs font-bold text-[#B42318]">As senhas não conferem.</p>
              )}

              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#6B7280]">
                <input
                  type="checkbox"
                  checked={isPasswordVisible}
                  onChange={(event) => setIsPasswordVisible(event.target.checked)}
                  className="size-4 accent-[#16A34A]"
                />
                Mostrar senhas
              </label>

              <p className="text-xs font-semibold leading-5 text-[#6B7280]">
                Ao alterar a senha, as sessões abertas em outros aparelhos serão encerradas.
              </p>

              {errorMessage && (
                <div role="alert" className="rounded-2xl border border-[#FECACA] bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B42318]">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="h-12 w-full cursor-pointer rounded-2xl bg-[#16A34A] text-sm font-extrabold text-white shadow-lg shadow-[#16A34A]/20 transition hover:bg-[#0B3D2E] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
              >
                {isSubmitting ? "Alterando..." : "Alterar senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

type PasswordInputProps = {
  label: string;
  type: "text" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
};

function PasswordInput({ label, type, value, onChange, autoComplete }: PasswordInputProps) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-[#111827]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="mt-2 h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#86EFAC]/30"
      />
    </label>
  );
}
