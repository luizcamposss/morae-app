import { Mail, UserRound } from "lucide-react";
import { useAuth } from "../../app/providers/useAuth";
import { Button } from "../../shared/components/Button";
import { ProfilePhotoBlock } from "../profile/ProfilePhotoBlock";
import { formatPhone } from "./phone";

// Photo, name and contact of the signed-in user at the top of a settings screen.
export function ProfileCard({ roleLabel, onEdit }: { roleLabel: string; onEdit: () => void }) {
  const { user } = useAuth();
  const displayName = user?.personName || user?.userName || "Usuário";

  return (
    <section className="rounded-card bg-superficie p-6 shadow-whisper">
      <ProfilePhotoBlock />
      <div className="mt-5 border-t border-linha pt-5">
        <p className="font-display text-2xl font-bold tracking-[-0.01em] text-tinta">{displayName}</p>
        <p className="mt-0.5 text-sm text-tinta-suave">{roleLabel}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2.5 text-tinta">
            <Mail size={16} strokeWidth={1.7} aria-hidden className="shrink-0 text-tinta-suave" />
            <dt className="sr-only">E-mail</dt>
            <dd className="min-w-0 break-all">{user?.email}</dd>
          </div>
          <div className="flex items-center gap-2.5 text-tinta">
            <UserRound size={16} strokeWidth={1.7} aria-hidden className="shrink-0 text-tinta-suave" />
            <dt className="sr-only">Telefone</dt>
            <dd>{user?.phoneNumber ? formatPhone(user.phoneNumber) : "Telefone não informado"}</dd>
          </div>
        </dl>
        <Button variant="quiet" size="sm" className="mt-5" onClick={onEdit}>
          Editar dados pessoais
        </Button>
      </div>
    </section>
  );
}
