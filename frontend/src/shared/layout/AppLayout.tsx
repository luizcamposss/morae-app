import { Outlet } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { MoraeMark } from "../components/MoraeMark";
import { NotificationsMenu } from "./NotificationsMenu";
import { Sidebar } from "./Sidebar";

// No top bar (DESIGN.md → Navigation): the bell and the avatar sit at the top right of the content.
// Redesigned screens bring their title up to this same line.
export function AppLayout() {
  return (
    <div className="min-h-screen bg-fundo text-tinta">
      <Sidebar />

      <div className="min-w-0 px-4 pb-28 pt-4 sm:px-6 lg:ml-62 lg:px-14 lg:pb-14 lg:pt-8">
        <div className="mb-6 flex items-center justify-between lg:justify-end">
          <MoraeMark withName size={24} className="lg:hidden" />
          <HeaderActions />
        </div>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function HeaderActions() {
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
