import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import type { ThemePreference } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import type { User } from "../types";
import { getInitials } from "../utils/format";
import { getCardClosingDay, setCardClosingDay } from "../utils/preferences";
import { Field, FormError, Segmented } from "../components/ui/Form";
import { IconLogout } from "../components/ui/Icons";

export function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [closingDay, setClosingDay] = useState(() => String(getCardClosingDay() ?? ""));

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setNameError("Informe seu nome.");
    setSavingName(true);
    setNameError(null);
    try {
      const res = await api.put<User>("/auth/me", { name: name.trim() });
      updateUser(res.data);
      toast("Perfil atualizado");
    } catch (err) {
      setNameError(getErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 6) return setPasswordError("A nova senha precisa ter pelo menos 6 caracteres.");
    if (newPassword !== confirmPassword) return setPasswordError("As senhas não conferem.");
    setSavingPassword(true);
    try {
      await api.put("/auth/password", { current_password: currentPassword, new_password: newPassword });
      toast("Senha alterada");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  function saveClosingDay(value: string) {
    setClosingDay(value);
    const day = Number(value);
    setCardClosingDay(Number.isInteger(day) && day >= 1 && day <= 31 ? day : null);
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>
            {getInitials(user?.name ?? "")}
          </span>
          <div>
            <h1 className="page-title">{user?.name}</h1>
            <p className="page-subtitle" style={{ marginTop: 2 }}>{user?.email}</p>
          </div>
        </div>
      </div>

      <form className="card" onSubmit={saveName}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Dados pessoais</h2>
          </div>
        </div>
        <div className="form-stack">
          <div className="field-row">
            <Field label="Nome" htmlFor="profile-name">
              <input id="profile-name" className="input" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="E-mail" htmlFor="profile-email">
              <input id="profile-email" className="input" value={user?.email ?? ""} disabled />
            </Field>
          </div>
          <FormError message={nameError} />
          <div>
            <button className="btn btn-primary" disabled={savingName || name.trim() === user?.name}>
              {savingName ? <span className="spinner" /> : "Salvar"}
            </button>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Preferências</h2>
            <p className="card-subtitle">Salvas neste dispositivo</p>
          </div>
        </div>
        <div className="form-stack">
          <Field label="Tema">
            <Segmented<ThemePreference>
              label="Tema"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "system", label: "Automático" },
                { value: "light", label: "Claro" },
                { value: "dark", label: "Escuro" },
              ]}
            />
          </Field>
          <Field
            label="Dia de fechamento da fatura do cartão"
            htmlFor="closing-day"
            hint="Compras feitas a partir desse dia são sugeridas para a fatura do mês seguinte. Deixe vazio para usar o mês da compra."
          >
            <input
              id="closing-day"
              className="input"
              type="number"
              min={1}
              max={31}
              placeholder="Ex.: 25"
              value={closingDay}
              onChange={(e) => saveClosingDay(e.target.value)}
              style={{ maxWidth: 140 }}
            />
          </Field>
        </div>
      </div>

      <form className="card" onSubmit={savePassword}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Alterar senha</h2>
          </div>
        </div>
        <div className="form-stack">
          <Field label="Senha atual" htmlFor="current-password">
            <input
              id="current-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <div className="field-row">
            <Field label="Nova senha" htmlFor="new-password">
              <input
                id="new-password"
                className="input"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirmar nova senha" htmlFor="confirm-password">
              <input
                id="confirm-password"
                className="input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
          </div>
          <FormError message={passwordError} />
          <div>
            <button className="btn btn-secondary" disabled={savingPassword || !currentPassword || !newPassword}>
              {savingPassword ? <span className="spinner" /> : "Alterar senha"}
            </button>
          </div>
        </div>
      </form>

      <button
        className="btn btn-danger-ghost"
        style={{ alignSelf: "flex-start" }}
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        <IconLogout size={16} /> Sair da conta
      </button>
    </div>
  );
}
