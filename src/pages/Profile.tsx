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
import { IconCamera, IconDownload, IconLogout } from "../components/ui/Icons";
import { ehIOS, estaInstalado, instalarApp, useInstalavel } from "../utils/pwa";

export function Profile() {
  const { user, updateUser, logout } = useAuth();
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
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <label className="avatar-upload" title="Trocar foto">
            <UserAvatar name={user?.name ?? ""} avatar={user?.avatar} size={64} />
            <span className="avatar-upload-badge" aria-hidden="true">
              <IconCamera size={13} />
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
          <div>
            <div className="eyebrow-row">
              <span className="eyebrow">Sua conta</span>
            </div>
            <h1 className="page-title">{user?.name}</h1>
            <p className="page-subtitle" style={{ marginTop: 2 }}>{user?.email}</p>
            <div className="page-actions" style={{ marginTop: 8 }}>
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
                  Remover
                </button>
              )}
            </div>
            <FormError message={photoError} />
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
            <p className="card-subtitle">O dia de fechamento agora fica em cada cartão</p>
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
