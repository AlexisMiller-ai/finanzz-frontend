import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";
import { AuthLayout, PasswordInput } from "../components/AuthLayout";
import { Field, FormError } from "../components/ui/Form";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível criar a conta."));
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1>Criar conta</h1>
      <p className="page-subtitle">Comece a controlar suas finanças em poucos minutos.</p>

      <form className="form-stack" onSubmit={handleSubmit}>
        <Field label="Nome" htmlFor="name">
          <input
            id="name"
            className="input"
            autoComplete="name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Senha" htmlFor="password" hint="Mínimo de 6 caracteres">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={6} />
        </Field>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? <span className="spinner" /> : "Criar conta"}
        </button>
      </form>

      <p className="auth-switch">
        Já tem conta? <Link to="/login" className="link-btn">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
