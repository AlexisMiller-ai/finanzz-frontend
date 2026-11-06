import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage, TOKEN_KEY } from "../services/api";
import { useApp } from "../contexts/AppContext";
import type { ThemePreference } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import type { User } from "../types";
import { prepararFotoPerfil } from "../utils/image";
import { UserAvatar } from "../components/ui/Common";
import { Field, FormError, Segmented } from "../components/ui/Form";
import { IconAlert, IconCamera, IconDownload, IconLogout, IconShield, IconTrash } from "../components/ui/Icons";
import { Modal } from "../components/Modal";
import { ehIOS, estaInstalado, instalarApp, useInstalavel } from "../utils/pwa";

export function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { theme, setTheme } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function trocarFoto(arquivo: File) {
    setPhotoError(null);
    setSavingPhoto(true);
    try {
      const image = await prepararFotoPerfil(arquivo);
      const res = await api.put<User>("/auth/avatar", { image });
      updateUser(res.data);
      toast("Foto atualizada");
    } catch (err) {
      setPhotoError(err instanceof Error && !("isAxiosError" in err) ? err.message : getErrorMessage(err));
    } finally {
      setSavingPhoto(false);
    }
  }

  async function removerFoto() {
    setPhotoError(null);
    setSavingPhoto(true);
    try {
      const res = await api.delete<User>("/auth/avatar");
      updateUser(res.data);
      toast("Foto removida");
    } catch (err) {
      setPhotoError(getErrorMessage(err));
    } finally {
      setSavingPhoto(false);
    }
  }

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
    if (newPassword.length < 8) return setPasswordError("A nova senha precisa ter pelo menos 8 caracteres.");
    if (newPassword !== confirmPassword) return setPasswordError("As senhas não conferem.");
    setSavingPassword(true);
    try {
      const res = await api.put<{ token: string }>("/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      // A troca de senha desconecta os outros aparelhos; este segue com o token novo.
      localStorage.setItem(TOKEN_KEY, res.data.token);
      toast("Senha alterada. Os outros aparelhos foram desconectados.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="page profile-page">
      <section className="card profile-hero">
        <label className="avatar-upload" title="Trocar foto">
          <UserAvatar name={user?.name ?? ""} avatar={user?.avatar} size={88} />
          <span className="avatar-upload-badge" aria-hidden="true">
            <IconCamera size={14} />
          </span>
          <input
            type="file"
            accept="image/*"
            aria-label="Trocar foto de perfil"
            disabled={savingPhoto}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) trocarFoto(arquivo);
              e.target.value = "";
            }}
          />
        </label>

        <div className="profile-hero-info">
          <span className="eyebrow">Sua conta</span>
          <h1 className="page-title">{user?.name}</h1>
          <p className="page-subtitle">{user?.email}</p>
          <div className="page-actions profile-hero-actions">
            <label className="btn btn-secondary btn-sm" style={{ position: "relative" }}>
              {savingPhoto ? <span className="spinner" /> : user?.avatar ? "Trocar foto" : "Adicionar foto"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={savingPhoto}
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) trocarFoto(arquivo);
                  e.target.value = "";
                }}
              />
            </label>
            {user?.avatar && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={removerFoto} disabled={savingPhoto}>
                Remover foto
              </button>
            )}
          </div>
          <FormError message={photoError} />
        </div>

        <button
          type="button"
          className="btn btn-secondary profile-hero-logout"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <IconLogout size={16} /> Sair da conta
        </button>
      </section>

      <div className="profile-grid">
        {/* Coluna da conta: quem você é e como entra. */}
        <div className="profile-col">
          <form className="card" onSubmit={saveName}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Dados pessoais</h2>
                <p className="card-subtitle">Como você aparece no Finanzz</p>
              </div>
            </div>
            <div className="form-stack">
              <div className="field-row">
                <Field label="Nome" htmlFor="profile-name">
                  <input id="profile-name" className="input" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="E-mail" htmlFor="profile-email" hint="O e-mail é o seu login e não pode ser alterado.">
                  <input id="profile-email" className="input" value={user?.email ?? ""} disabled />
                </Field>
              </div>
              <FormError message={nameError} />
              <div>
                <button className="btn btn-primary" disabled={savingName || name.trim() === user?.name}>
                  {savingName ? <span className="spinner" /> : "Salvar alterações"}
                </button>
              </div>
            </div>
          </form>

          <form className="card" onSubmit={savePassword}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Alterar senha</h2>
                <p className="card-subtitle">Os outros aparelhos são desconectados quando a senha muda</p>
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
                <Field label="Nova senha" htmlFor="new-password" hint="Mínimo de 8 caracteres">
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
        </div>

        {/* Coluna do app: preferências, instalação e dados. */}
        <div className="profile-col">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Preferências</h2>
                <p className="card-subtitle">Aparência e atalhos</p>
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
              <Field label="Atalhos">
                <div className="page-actions">
                  <Link className="btn btn-secondary btn-sm" to="/relatorios">
                    Relatórios
                  </Link>
                  <Link className="btn btn-secondary btn-sm" to="/contas">
                    Contas e cartões
                  </Link>
                  <Link className="btn btn-secondary btn-sm" to="/categorias">
                    Categorias
                  </Link>
                  <Link className="btn btn-secondary btn-sm" to="/importar">
                    Importar extrato
                  </Link>
                </div>
              </Field>
            </div>
          </div>

          <InstalarCard />

          <div className="card card-danger">
            <div className="card-header">
              <div>
                <h2 className="card-title">Privacidade e dados</h2>
                <p className="card-subtitle">O que o Finanzz guarda e como apagar tudo</p>
              </div>
            </div>
            <div className="form-stack">
              <Link to="/privacidade" className="link-btn" style={{ alignSelf: "flex-start" }}>
                <IconShield size={15} /> Ler o aviso de privacidade
              </Link>
              <p className="muted" style={{ margin: 0 }}>
                Excluir a conta apaga para sempre seus lançamentos, contas, cartões, categorias, orçamentos, metas
                e foto. Se quiser guardar uma cópia, exporte seus lançamentos em CSV antes.
              </p>
              <button
                className="btn btn-danger-ghost"
                style={{ alignSelf: "flex-start" }}
                onClick={() => setDeletingAccount(true)}
              >
                <IconTrash size={16} /> Excluir minha conta
              </button>
            </div>
          </div>
        </div>
      </div>

      {deletingAccount && <DeleteAccountModal onClose={() => setDeletingAccount(false)} />}
    </div>
  );
}

const CONFIRMACAO = "EXCLUIR";

/**
 * Exclusão definitiva da conta. Pede a senha (a API confere de novo) e que a
 * pessoa digite EXCLUIR, para não acontecer por um toque sem querer.
 */
function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pronto = password.length > 0 && confirmation.trim().toUpperCase() === CONFIRMACAO;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pronto) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete("/auth/me", { data: { password } });
      logout();
      navigate("/login", { replace: true });
      toast("Sua conta e todos os seus dados foram excluídos.");
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal
      title="Excluir minha conta"
      description="Isso apaga todos os seus dados do Finanzz na hora e não pode ser desfeito."
      onClose={onClose}
      size="sm"
      onSubmit={handleSubmit}
      footer={
        <button type="submit" className="btn btn-danger" disabled={!pronto || deleting}>
          {deleting ? <span className="spinner" /> : "Excluir para sempre"}
        </button>
      }
    >
      <div className="form-stack">
        <div className="alert alert-warning">
          <IconAlert size={16} />
          <span>
            Saem lançamentos, contas, cartões, faturas, categorias, orçamentos, metas, foto e o seu acesso.
          </span>
        </div>
        <Field label="Sua senha" htmlFor="delete-password">
          <input
            id="delete-password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label={`Digite ${CONFIRMACAO} para confirmar`} htmlFor="delete-confirmation">
          <input
            id="delete-confirmation"
            className="input"
            autoComplete="off"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

/**
 * Instalar o Finanzz na tela inicial. O convite do navegador só aparece em
 * alguns casos, então aqui também ficam as instruções para quem não o recebe
 * (iPhone, por exemplo, só instala pelo menu Compartilhar do Safari).
 */
function InstalarCard() {
  const toast = useToast();
  const instalavel = useInstalavel();
  const [instalado, setInstalado] = useState(() => estaInstalado());

  async function instalar() {
    if (await instalarApp()) {
      setInstalado(true);
      toast("Finanzz instalado na tela inicial");
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Instalar no celular</h2>
          <p className="card-subtitle">
            Ícone na tela inicial, sem a barra do navegador, e as telas de consulta abrem mesmo sem
            internet
          </p>
        </div>
      </div>
      {instalado ? (
        <p className="muted">O Finanzz já está instalado neste aparelho.</p>
      ) : instalavel ? (
        <button className="btn btn-primary" onClick={instalar}>
          <IconDownload size={16} /> Instalar o Finanzz
        </button>
      ) : ehIOS() ? (
        <p className="muted">
          No iPhone ou iPad: abra o Finanzz no Safari, toque em <strong>Compartilhar</strong> e
          escolha <strong>Adicionar à Tela de Início</strong>.
        </p>
      ) : (
        <p className="muted">
          Abra o menu do navegador e escolha <strong>Instalar aplicativo</strong>. Se a opção não
          aparecer, o app já está instalado ou o navegador não oferece instalação.
        </p>
      )}
    </div>
  );
}
