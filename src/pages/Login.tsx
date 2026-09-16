import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";
import { AuthLayout, PasswordInput } from "../components/AuthLayout";
import { Field, FormError } from "../components/ui/Form";
import { IconInfo } from "../components/ui/Icons";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível entrar."));
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1>Entrar</h1>
      <p className="page-subtitle">Acesse seu controle financeiro.</p>

      <form className="form-stack" onSubmit={handleSubmit}>
        {params.get("expirada") && (
          <div className="alert alert-info">
            <IconInfo size={16} />
            <span>Sua sessão expirou. Entre novamente.</span>
          </div>
        )}
        <Field label="E-mail" htmlFor="email">
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Senha" htmlFor="password">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? <span className="spinner" /> : "Entrar"}
        </button>
      </form>

      <p className="auth-switch">
        Não tem conta? <Link to="/cadastro" className="link-btn">Criar conta</Link>
      </p>
    </AuthLayout>
  );
}
