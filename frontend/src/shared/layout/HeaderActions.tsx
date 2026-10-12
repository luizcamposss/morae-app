import { useAuth } from "../../app/providers/useAuth";
import { NotificationsMenu } from "./NotificationsMenu";

export function HeaderActions() {
  const { user } = useAuth();
  const displayName = user?.personName || user?.userName || "Usuário";

  return (
    <div className="flex items-center gap-3">
      <NotificationsMenu />
      {user?.profilePhotoUrl ? (
        <img src={user.profilePhotoUrl} alt={displayName} className="size-10 rounded-full object-cover" />
      ) : (
        <span
          title={displayName}
          className="grid size-10 place-items-center rounded-full bg-verde-suave text-sm font-bold text-verde-tinta"
        >
          {getInitials(displayName)}
        </span>
      )}
    </div>
  );
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "U";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();

  return `${words[0].slice(0, 1)}${words[words.length - 1].slice(0, 1)}`.toUpperCase();
}
