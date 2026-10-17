import { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { Switch } from "../../shared/components/Switch";
import { getNotificationPreferences, updateNotificationPreferences } from "../me/meService";
import type { NotificationPreferences } from "../me/types";
import { FormFeedback } from "./FormFeedback";

export type NotificationOption = { key: keyof NotificationPreferences; label: string; description: string };

// The user's notification switches; each role passes its own wording for the three options.
export function NotificationsModal({ options, onClose }: { options: NotificationOption[]; onClose: () => void }) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getNotificationPreferences()
      .then((result) => isMounted && setPreferences(result))
      .catch((error) => isMounted && setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar suas preferências."));

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    if (!preferences) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      setPreferences(await updateNotificationPreferences(preferences));
      setSuccessMessage("Preferências salvas.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar suas preferências.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="Notificações"
      description="O que aparece no sininho e chega por e-mail."
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => void handleSave()} disabled={!preferences} isLoading={isSubmitting} loadingText="Salvando…">
            Salvar
          </Button>
        </>
      }
    >
      <FormFeedback errorMessage={errorMessage} successMessage={successMessage} className="mb-2" />
      {preferences ? (
        <div className="divide-y divide-linha">
          {options.map((option) => (
            <Switch
              key={option.key}
              label={option.label}
              description={option.description}
              checked={preferences[option.key]}
              onChange={(checked) => {
                setSuccessMessage("");
                setPreferences({ ...preferences, [option.key]: checked });
              }}
            />
          ))}
        </div>
      ) : (
        !errorMessage && <p className="py-6 text-center text-sm text-tinta-suave">Carregando…</p>
      )}
    </Modal>
  );
}
