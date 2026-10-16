import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";
import { AuthLayout, IconInput, PasswordInput } from "../components/AuthLayout";
import { IconArrowRight, IconMail, IconUser } from "../components/ui/Icons";
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
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
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
    <AuthLayout mode="cadastro" title="Crie sua conta." subtitle="Leva menos de um minuto. Depois é só cadastrar suas contas e o salário.">

      <form className="form-stack" onSubmit={handleSubmit}>
        <Field label="Nome" htmlFor="name">
          <IconInput
            icon={<IconUser size={16} />}
            id="name"
            placeholder="Seu nome"
            autoComplete="name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </Field>
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
          />
        </Field>
        <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} placeholder="Crie uma senha" />
        </Field>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary btn-lg btn-block auth-submit" disabled={loading}>
          {loading ? <span className="spinner" /> : <>Criar minha conta <IconArrowRight size={16} /></>}
        </button>
      </form>

    </AuthLayout>
  );
}
