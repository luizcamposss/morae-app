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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {user?.profilePhotoUrl ? (
          <img src={user.profilePhotoUrl} alt={`Foto de ${displayName}`} className="size-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-verde-suave font-display text-2xl font-bold text-verde-tinta">
            {avatarLetter}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={inputId}
            className={`inline-flex min-h-9 cursor-pointer items-center rounded-full bg-campo px-4 text-sm font-semibold text-tinta transition-colors hover:bg-menu ${isSubmitting ? "pointer-events-none opacity-60" : ""}`}
          >
            {isSubmitting ? "Salvando…" : user?.profilePhotoUrl ? "Trocar foto" : "Adicionar foto"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isSubmitting}
            className="sr-only"
            onChange={(event) => {
              void handleFileChange(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {user?.profilePhotoUrl && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleRemovePhoto()}
              className="rounded-full px-3 text-sm font-semibold text-vermelho hover:underline disabled:opacity-60"
            >
              Remover
            </button>
          )}
        </div>
      </div>
      <p className={`text-[13px] ${errorMessage ? "font-medium text-vermelho" : successMessage ? "text-verde-tinta" : "text-tinta-suave"}`}>
        {errorMessage || successMessage || "JPG, PNG ou WEBP de até 500 KB."}
      </p>
    </div>
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
