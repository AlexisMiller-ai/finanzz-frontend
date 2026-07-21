import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      const message =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F7F8FA",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          width: "100%",
          maxWidth: 380,
          border: "1px solid #EEE",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 20,
            marginBottom: 20,
          }}
        >
          $
        </div>

        <div
          style={{
            color: "#7C3AED",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          CRIAR CONTA
        </div>
        <h1
          style={{ fontSize: 26, fontWeight: 800, color: "#1A1A1A", margin: 0 }}
        >
          Cadastro
        </h1>
        <p
          style={{
            color: "#888",
            fontSize: 14,
            marginTop: 6,
            marginBottom: 24,
          }}
        >
          Comece a controlar suas finanças.
        </p>

        <Field label="Nome" style={{ marginBottom: 14 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </Field>

        <Field label="E-mail" style={{ marginBottom: 14 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Senha" style={{ marginBottom: 20 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
        </Field>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
              background: "#FEE2E2",
              color: "#991B1B",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: 10,
            border: "none",
            background: "#7C3AED",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Criando conta..." : "Criar conta"}
        </button>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 13 }}>
          <span style={{ color: "#999" }}>Já tem conta? </span>
          <Link
            to="/login"
            style={{
              color: "#7C3AED",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Entrar
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <label
        style={{
          fontSize: 12,
          color: "#555",
          fontWeight: 600,
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 8,
  border: "1px solid #DDD",
  fontSize: 14,
  color: "#1A1A1A",
  outline: "none",
};
