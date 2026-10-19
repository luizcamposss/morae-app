import { useState } from "react";
import { CreditCard, QrCode } from "lucide-react";
import { Button, ButtonLink } from "../../shared/components/Button";
import { GroupedList, GroupedRow } from "../../shared/components/GroupedList";
import { Modal } from "../../shared/components/Modal";
import { upsertCondominiumFinancialAccount } from "../financialAccounts/financialAccountService";
import { describePixKey } from "../financialAccounts/pixKey";
import { createInvitation } from "../invitations/invitationService";
import { MercadoPagoConnectionPanel } from "../mercadoPago/MercadoPagoConnectionPanel";
import { FormFeedback } from "../settings/FormFeedback";
import { PixKeyModal } from "../settings/PixKeyModal";
import { StatusChip } from "../settings/StatusChip";
import { errorText, hasPendingInvitation, invitablePeople, runInBatches, type SetupData } from "./setupData";

type ReceivingStepProps = {
  data: SetupData;
  condominiumName: string;
  onSaved: () => void;
};

const RESIDENT_ROLE = 4;

// Step 4: where the charges are paid (Pix key or Mercado Pago) and app invitations for the residents.
export function ReceivingStep({ data, condominiumName, onSaved }: ReceivingStepProps) {
  const [modal, setModal] = useState<"pix" | "mercadoPago" | null>(null);
  const invitable = invitablePeople(data.people, data.invitations);
  // Nobody starts selected: an existing condominium may have many residents without access.
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selected = invitable.filter((person) => chosen.has(person.id));
  const withoutAccess = data.people.filter((person) => !person.hasRegisteredUser);
  const pixKey = data.account?.pixKey ?? "";

  function toggle(personId: number) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  async function handleInvite() {
    setIsSending(true);
    setErrorMessage("");
    setSuccessMessage("");
    const results = await runInBatches(selected, 3, (person) =>
      createInvitation({ condominiumId: data.condominiumId, personId: person.id, email: person.email ?? "", role: RESIDENT_ROLE }),
    );
    setIsSending(false);
    const sent = results.filter((result) => result.status === "fulfilled").length;
    const firstFailure = results.find((result) => result.status === "rejected");
    if (sent) setSuccessMessage(sent === 1 ? "1 convite enviado por e-mail." : `${sent} convites enviados por e-mail.`);
    if (firstFailure?.status === "rejected") {
      const failed = results.length - sent;
      setErrorMessage(`${failed === 1 ? "1 convite não foi enviado" : `${failed} convites não foram enviados`}: ${errorText(firstFailure.reason, "erro ao enviar")}`);
    }
    onSaved();
  }

  return (
    <div className="mt-2">
      <p className="mb-6 max-w-2xl text-[15px] text-tinta-suave">
        Escolha como as cobranças serão pagas e convide os moradores para o app. O Moraê não cobra taxa: o Mercado Pago fica só com a tarifa dele, de quem recebe.
      </p>

      <div className="mb-8">
        <GroupedList title="Recebimento" footer="O Mercado Pago recebe Pix, cartão e boleto pelo app e dá baixa sozinho. A chave Pix serve para pagamentos manuais.">
          <GroupedRow
            icon={CreditCard}
            tone={data.isMercadoPagoConnected ? "green" : "neutral"}
            title="Mercado Pago"
            subtitle={data.isMercadoPagoConnected ? "Pagamentos online com baixa automática" : "Conecte para receber online"}
            trailing={<StatusChip tone={data.isMercadoPagoConnected ? "success" : "warning"}>{data.isMercadoPagoConnected ? "Conectado" : "Não conectado"}</StatusChip>}
            onClick={() => setModal("mercadoPago")}
          />
          <GroupedRow
            icon={QrCode}
            tone={pixKey ? "green" : "neutral"}
            title="Chave Pix"
            subtitle={pixKey && data.account ? describePixKey(data.account.pixKeyType, pixKey) : "Para pagamentos manuais"}
            trailing={<StatusChip tone={pixKey ? "success" : "warning"}>{pixKey ? "Cadastrada" : "Não cadastrada"}</StatusChip>}
            onClick={() => setModal("pix")}
          />
        </GroupedList>
      </div>

      <h3 className="mb-1 font-display text-[19px] font-bold tracking-[-0.01em] text-tinta">Convites para o app</h3>
      <p className="mb-4 text-[13px] text-tinta-suave">Quem tem e-mail recebe um link para criar a senha. O link vale por 7 dias.</p>

      <FormFeedback errorMessage={errorMessage} successMessage={successMessage} className="mb-4" />

      {withoutAccess.length === 0 ? (
        <p className="rounded-card bg-superficie px-5 py-6 text-center text-sm text-tinta-suave shadow-whisper">
          {data.people.length ? "Todos os moradores cadastrados já têm acesso ao app." : "Nenhum morador cadastrado ainda. Volte à etapa anterior para cadastrar."}
        </p>
      ) : (
        <ul className="divide-y divide-linha overflow-hidden rounded-card bg-superficie shadow-whisper">
          {withoutAccess.map((person) => {
            const canInvite = invitable.some((item) => item.id === person.id);
            const status = canInvite ? null : person.email ? (hasPendingInvitation(person.id, data.invitations) ? "Convite enviado" : "Já convidado") : "Sem e-mail";
            return (
              <li key={person.id}>
                <label className={`flex items-center gap-3.5 px-5 py-3.5 ${canInvite ? "cursor-pointer hover:bg-campo/60" : ""}`}>
                  <input
                    type="checkbox"
                    className="size-[18px] shrink-0 accent-verde disabled:opacity-40"
                    disabled={!canInvite}
                    checked={canInvite && chosen.has(person.id)}
                    onChange={() => toggle(person.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-tinta">{person.name}</span>
                    <span className="block truncate text-[13px] text-tinta-suave">{[person.mainUnit, person.email].filter(Boolean).join(" · ") || "Sem unidade"}</span>
                  </span>
                  {status && <StatusChip tone={status === "Sem e-mail" ? "warning" : "success"}>{status}</StatusChip>}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {invitable.length > 1 && (
          <Button
            variant="quiet"
            onClick={() => setChosen(selected.length === invitable.length ? new Set() : new Set(invitable.map((person) => person.id)))}
          >
            {selected.length === invitable.length ? "Desmarcar todos" : `Marcar todos com e-mail (${invitable.length})`}
          </Button>
        )}
        {invitable.length > 0 && (
          <Button variant="accent" disabled={!selected.length} isLoading={isSending} loadingText="Enviando…" onClick={handleInvite}>
            {selected.length === 0 ? "Enviar convites" : selected.length === 1 ? "Enviar 1 convite" : `Enviar ${selected.length} convites`}
          </Button>
        )}
        {withoutAccess.some((person) => !person.email) && (
          <ButtonLink to="/admin/people" variant="quiet">
            Completar e-mails em Moradores
          </ButtonLink>
        )}
      </div>

      {modal === "pix" && (
        <PixKeyModal
          title="Chave Pix do condomínio"
          description={`Para cobranças do ${condominiumName} pagas fora do app.`}
          account={data.account}
          save={(account) => upsertCondominiumFinancialAccount(data.condominiumId, account)}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {modal === "mercadoPago" && (
        <Modal
          title="Mercado Pago do condomínio"
          description="A conta onde as cobranças pagas online caem."
          onClose={() => {
            setModal(null);
            onSaved();
          }}
        >
          <MercadoPagoConnectionPanel
            contextLabel={condominiumName}
            condominiumId={data.condominiumId}
            onBack={() => {
              setModal(null);
              onSaved();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
