import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Category } from "../types";

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"despesa" | "receita">("despesa");
  const [color, setColor] = useState("#7C3AED");
  const [saving, setSaving] = useState(false);

  async function loadCategories() {
    const res = await api.get<Category[]>("/categories");
    setCategories(res.data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;

    setSaving(true);
    try {
      await api.post("/categories", { name, type, color });
      setName("");
      await loadCategories();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/categories/${id}`);
    await loadCategories();
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{ fontSize: 26, fontWeight: 800, color: "#1A1A1A", margin: 0 }}
        >
          Categorias
        </h1>
        <p style={{ color: "#888", marginTop: 6, fontSize: 14 }}>
          Gerencie as categorias usadas nos seus lançamentos.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 24,
          background: "#fff",
          padding: 16,
          borderRadius: 14,
          border: "1px solid #EEE",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <input
          type="text"
          placeholder="Nome da categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #DDD",
            fontSize: 14,
          }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "despesa" | "receita")}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #DDD",
            fontSize: 14,
          }}
        >
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            width: 44,
            height: 40,
            border: "1px solid #DDD",
            borderRadius: 8,
            cursor: "pointer",
          }}
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#7C3AED",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Adicionar
        </button>
      </form>

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #EEE",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {categories.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderBottom: "1px solid #F3F3F3",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: c.color,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 14, color: "#1A1A1A" }}>{c.name}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: c.type === "despesa" ? "#FEE2E2" : "#DCFCE7",
                  color: c.type === "despesa" ? "#991B1B" : "#166534",
                }}
              >
                {c.type}
              </span>
            </div>
            <button
              onClick={() => handleDelete(c.id)}
              style={{
                border: "none",
                background: "transparent",
                color: "#DC2626",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
