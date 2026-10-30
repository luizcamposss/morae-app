import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Button } from "../../shared/components/Button";
import { Modal } from "../../shared/components/Modal";
import { SelectField } from "../../shared/components/SelectField";
import { StateSelectField } from "../../shared/components/StateSelectField";
import { TextField } from "../../shared/components/TextField";
import type { MasterUserResponse } from "../masterUsers/types";
import {
  ACTIVE_STATUS,
  BRAZILIAN_STATES,
  INACTIVE_STATUS,
  formatCepInput,
  formatCnpjInput,
  formatCpfInput,
  formatPhoneInput,
  getAddressByCep,
  onlyDigits,
  type FieldErrors,
  type FormState,
  type ModalMode,
} from "./condominiumForm";

type CondominiumFormModalProps = {
  form: FormState;
  mode: Exclude<ModalMode, null>;
  adminUsers: MasterUserResponse[];
  fieldErrors: FieldErrors;
  errorMessage: string;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<FormState>>;
  onClearFieldError: (field: keyof FormState) => void;
  onClose: () => void;
  onAddAdmin: () => void;
  onRemoveAdmin: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const FORM_ID = "condominium-form";

export function CondominiumFormModal({
  form,
  mode,
  adminUsers,
  fieldErrors,
  errorMessage,
  isSaving,
  onChange,
  onClearFieldError,
  onClose,
  onAddAdmin,
  onRemoveAdmin,
  onSubmit,
}: CondominiumFormModalProps) {
  const isEdit = mode === "edit";
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepMessage, setCepMessage] = useState("");

  function updateField(field: keyof FormState, value: string | number) {
    onChange((currentForm) => ({ ...currentForm, [field]: value }));
    onClearFieldError(field);
  }

  async function handleCepChange(value: string) {
    const nextCep = formatCepInput(value);
    setCepMessage("");
    onClearFieldError("cep");
    onChange((currentForm) => ({ ...currentForm, cep: nextCep }));

    const cepDigits = onlyDigits(nextCep);

    if (cepDigits.length !== 8) {
      return;
    }

    try {
      setIsLoadingCep(true);
      const address = await getAddressByCep(cepDigits);

      if (!address) {
        setCepMessage("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }

      onChange((currentForm) => ({
        ...currentForm,
        cep: nextCep,
        address: address.logradouro || currentForm.address,
        city: address.localidade || currentForm.city,
        state: address.uf || currentForm.state,
      }));
      onClearFieldError("address");
      onClearFieldError("city");
      onClearFieldError("state");
    } catch {
      setCepMessage("Não foi possível consultar o CEP agora. Preencha manualmente.");
    } finally {
      setIsLoadingCep(false);
    }
  }

  return (
    <Modal
      size="lg"
      title={isEdit ? "Editar condomínio" : "Novo condomínio"}
      description={isEdit ? "Atualize os dados do condomínio." : "Cadastre o condomínio e o primeiro administrador. O convite sai por e-mail."}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={isSaving} loadingText="Salvando…">
            {isEdit ? "Salvar alterações" : "Cadastrar e enviar convite"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {errorMessage && (
          <p role="alert" className="rounded-field bg-vermelho-suave px-4 py-3 text-sm font-medium text-vermelho">
            {errorMessage}
          </p>
        )}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-[13px] font-semibold text-tinta-suave">Dados do condomínio</legend>
          <TextField
            className="sm:col-span-2"
            label="Nome do condomínio"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Residencial Jardins"
            error={fieldErrors.name}
          />
          <TextField
            label="CNPJ"
            value={form.cnpj}
            onChange={(event) => updateField("cnpj", formatCnpjInput(event.target.value))}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            disabled={isEdit}
            error={fieldErrors.cnpj}
          />
          <TextField
            label="E-mail de contato"
            type="email"
            value={form.emailContact}
            onChange={(event) => updateField("emailContact", event.target.value)}
            placeholder="contato@condominio.com.br"
            error={fieldErrors.emailContact}
          />
          <TextField
            label="CEP"
            value={form.cep}
            onChange={(event) => void handleCepChange(event.target.value)}
            placeholder="00000-000"
            inputMode="numeric"
            hint={isLoadingCep ? "Buscando endereço…" : cepMessage || undefined}
            error={fieldErrors.cep}
          />
          <TextField
            label="Número"
            value={form.number}
            onChange={(event) => updateField("number", event.target.value)}
            placeholder="100"
            error={fieldErrors.number}
          />
          <TextField
            className="sm:col-span-2"
            label="Endereço"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Rua das Palmeiras"
            error={fieldErrors.address}
          />
          <TextField
            label="Cidade"
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
            placeholder="São Paulo"
            error={fieldErrors.city}
          />
          <StateSelectField
            label="Estado"
            value={form.state}
            onChange={(state) => updateField("state", state)}
            placeholder="Selecione a UF"
            options={BRAZILIAN_STATES}
            error={fieldErrors.state}
          />
        </fieldset>

        {isEdit ? (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-[13px] font-semibold text-tinta-suave">Situação e administração</legend>
            <SelectField
              label="Situação"
              value={String(form.status)}
              onChange={(event) => updateField("status", Number(event.target.value))}
              options={[
                { value: String(ACTIVE_STATUS), label: "Ativo" },
                { value: String(INACTIVE_STATUS), label: "Inativo" },
              ]}
            />
            <SelectField
              label="Admin vinculado"
              value={form.linkedAdminUserId}
              onChange={(event) => updateField("linkedAdminUserId", event.target.value)}
              placeholder="Sem admin"
              options={adminUsers.map((admin) => ({ value: String(admin.userId), label: `${admin.personName} · ${admin.email}` }))}
            />
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button variant="quiet" size="sm" onClick={onAddAdmin}>
                Convidar novo admin
              </Button>
              <Button variant="quiet" size="sm" onClick={onRemoveAdmin} disabled={!form.linkedAdminUserId || isSaving}>
                Remover admin
              </Button>
              <p className="text-[13px] text-tinta-suave">Ao trocar ou remover, o admin anterior perde o acesso a este condomínio.</p>
            </div>
          </fieldset>
        ) : (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-[13px] font-semibold text-tinta-suave">Primeiro administrador</legend>
            <TextField
              className="sm:col-span-2"
              label="Nome do administrador"
              value={form.adminName}
              onChange={(event) => updateField("adminName", event.target.value)}
              placeholder="Carla Mendes"
              error={fieldErrors.adminName}
            />
            <TextField
              label="CPF"
              value={form.adminCpf}
              onChange={(event) => updateField("adminCpf", formatCpfInput(event.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              error={fieldErrors.adminCpf}
            />
            <TextField
              label="Telefone"
              value={form.adminPhoneNumber}
              onChange={(event) => updateField("adminPhoneNumber", formatPhoneInput(event.target.value))}
              placeholder="(11) 99999-9999"
              inputMode="tel"
              error={fieldErrors.adminPhoneNumber}
            />
            <TextField
              className="sm:col-span-2"
              label="E-mail do administrador"
              type="email"
              value={form.adminEmail}
              onChange={(event) => updateField("adminEmail", event.target.value)}
              placeholder="admin@email.com"
              hint="O convite para criar a senha vai para este e-mail."
              error={fieldErrors.adminEmail}
            />
          </fieldset>
        )}
      </form>
    </Modal>
  );
}
