import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";
import { AuthLayout, IconInput, PasswordInput } from "../components/AuthLayout";
import { Field, FormError } from "../components/ui/Form";
import { IconArrowRight, IconInfo, IconMail } from "../components/ui/Icons";

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
    <AuthLayout mode="entrar" title="Bem-vindo de volta." subtitle="Entre com o e-mail e a senha da sua conta Finanzz.">

      <form className="form-stack" onSubmit={handleSubmit}>
        {params.get("expirada") && (
          <div className="alert alert-info">
            <IconInfo size={16} />
            <span>Sua sessão expirou. Entre novamente.</span>
          </div>
        )}
        <Field label="E-mail" htmlFor="email">
          <IconInput
            icon={<IconMail size={16} />}
            id="email"
            type="email"
            placeholder="voce@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Senha" htmlFor="password">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Sua senha" />
        </Field>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary btn-lg btn-block auth-submit" disabled={loading}>
          {loading ? <span className="spinner" /> : <>Entrar no Finanzz <IconArrowRight size={16} /></>}
        </button>
      </form>

    </AuthLayout>
  );
}
