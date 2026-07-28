import { useId, useState } from "react";
import { useAuth } from "../../app/providers/useAuth";
import { updateProfilePhoto } from "../me/meService";

const MAX_PROFILE_PHOTO_SIZE = 500 * 1024;

export function ProfilePhotoBlock() {
  const inputId = useId();
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleFileChange(file?: File) {
    if (!file) return;

    setErrorMessage("");
    setSuccessMessage("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMessage("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setErrorMessage("A imagem deve ter no máximo 500 KB.");
      return;
    }

    try {
      setIsSubmitting(true);
      const profilePhotoUrl = await readFileAsDataUrl(file);
      await updateProfilePhoto(profilePhotoUrl);
      await refreshUser();
      setSuccessMessage("Foto de perfil atualizada.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar sua foto.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemovePhoto() {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await updateProfilePhoto(null);
      await refreshUser();
      setSuccessMessage("Foto de perfil removida.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível remover sua foto.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayName = user?.personName || user?.userName || "Usuário";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {user?.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt={`Foto de ${displayName}`}
              className="size-20 rounded-[1.5rem] object-cover shadow-sm"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-[1.5rem] bg-[#0B3D2E] text-2xl font-black text-white shadow-sm">
              {avatarLetter}
            </div>
          )}

          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#16A34A]">
              Perfil na plataforma
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#111827]">{displayName}</h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">
              Configure sua foto para aparecer no MORAÊ.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label
            htmlFor={inputId}
            className="inline-flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-[#16A34A] px-5 text-sm font-black text-white shadow-sm shadow-[#16A34A]/25 transition hover:bg-[#0B3D2E]"
          >
            {isSubmitting ? "Salvando..." : "Alterar foto"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isSubmitting}
            onChange={(event) => {
              void handleFileChange(event.target.files?.[0]);
              event.target.value = "";
            }}
            className="sr-only"
          />

          {user?.profilePhotoUrl && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleRemovePhoto()}
              className="h-12 cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-black text-[#6B7280] transition hover:border-[#FECACA] hover:bg-[#FDECEC] hover:text-[#B42318]"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      {(errorMessage || successMessage) && (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
            errorMessage
              ? "border-[#FECACA] bg-[#FDECEC] text-[#B42318]"
              : "border-[#BBF7D0] bg-[#DCFCE7] text-[#0B3D2E]"
          }`}
        >
          {errorMessage || successMessage}
        </p>
      )}
    </section>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}
