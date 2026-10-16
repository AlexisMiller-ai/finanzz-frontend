import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Category, TransactionType } from "../types";
import { ChoiceDialog, Modal } from "../components/Modal";
import { CategoryIcon, EmptyState, Skeleton } from "../components/ui/Common";
import { Field, FormError, Segmented } from "../components/ui/Form";
import { IconAlert, IconEdit, IconPlus, IconTag, IconTrash } from "../components/ui/Icons";

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#16A34A",
  "#10B981", "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6",
  "#A855F7", "#EC4899", "#F43F5E", "#64748B",
];

export function Categories() {
  const { data, error, reload } = useFetch<Category[]>("/categories");
  const [editing, setEditing] = useState<Category | "new-despesa" | "new-receita" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow-row">
            <span className="eyebrow">Cadastros</span>
          </div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">Organize seus lançamentos. Toque em uma categoria para editar.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new-despesa")}>
          <IconPlus size={16} /> Nova categoria
        </button>
      </div>

      {error && !data ? (
        <div className="card">
          <EmptyState
            icon={<IconAlert />}
            title="Não foi possível carregar as categorias"
            description={error}
            action={<button className="btn btn-secondary" onClick={reload}>Tentar novamente</button>}
          />
        </div>
      ) : (
        <div className="grid grid-halves" style={{ alignItems: "start" }}>
          {(["despesa", "receita"] as const).map((type) => {
            const list = data?.filter((c) => c.type === type) ?? [];
            return (
              <div key={type} className="card card-flush">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">{type === "despesa" ? "Despesas" : "Receitas"}</h2>
                    <p className="card-subtitle">
                      {data ? `${list.length} ${list.length === 1 ? "categoria" : "categorias"}` : " "}
                    </p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(`new-${type}`)}>
                    <IconPlus size={14} /> Adicionar
                  </button>
                </div>
                {!data ? (
                  <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} height={34} />
                    ))}
                  </div>
                ) : list.length === 0 ? (
                  <EmptyState icon={<IconTag />} title="Nenhuma categoria" />
                ) : (
                  <div className="list" style={{ paddingBottom: 6 }}>
                    {list.map((c) => (
                      <div key={c.id} className="list-row clickable" onClick={() => setEditing(c)}>
                        <CategoryIcon name={c.name} color={c.color} />
                        <div className="row-main">
                          <div className="row-title">{c.name}</div>
                          <div className="row-meta">
                            {c.transaction_count
                              ? `${c.transaction_count} ${c.transaction_count === 1 ? "lançamento" : "lançamentos"}`
                              : "Sem lançamentos"}
                          </div>
                        </div>
                        <div className="row-actions" style={{ display: "flex" }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-icon hide-mobile" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`}>
                            <IconEdit size={16} />
                          </button>
                          <button className="btn btn-icon danger" onClick={() => setDeleting(c)} aria-label={`Excluir ${c.name}`}>
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <CategoryModal
          category={typeof editing === "string" ? null : editing}
          defaultType={editing === "new-receita" ? "receita" : "despesa"}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && <DeleteCategoryDialog category={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}

function CategoryModal({
  category,
  defaultType,
  onClose,
}: {
  category: Category | null;
  defaultType: TransactionType;
  onClose: () => void;
}) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<TransactionType>(category?.type ?? defaultType);
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[11]!);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLocked = !!category?.transaction_count;
  const isCustomColor = !PRESET_COLORS.includes(color.toUpperCase());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Informe o nome da categoria.");
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), type, color: color.toUpperCase() };
      if (category) await api.put(`/categories/${category.id}`, payload);
      else await api.post("/categories", payload);
      toast(category ? "Categoria atualizada" : "Categoria criada");
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={category ? "Editar categoria" : "Nova categoria"}
      onClose={onClose}
      size="sm"
      onSubmit={handleSubmit}
      footer={
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : category ? "Salvar" : "Criar categoria"}
        </button>
      }
    >
      <div className="form-stack">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CategoryIcon name={name || "?"} color={color} />
          <input
            className="input"
            placeholder="Nome da categoria"
            value={name}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            aria-label="Nome da categoria"
          />
        </div>

        <Field
          label="Tipo"
          hint={typeLocked ? "O tipo não pode mudar porque a categoria já tem lançamentos." : undefined}
        >
          {typeLocked ? (
            <div>
              <span className={`badge ${type === "despesa" ? "badge-out" : "badge-in"}`}>
                {type === "despesa" ? "Despesa" : "Receita"}
              </span>
            </div>
          ) : (
            <Segmented
              className="type"
              label="Tipo"
              value={type}
              onChange={setType}
              options={[
                { value: "despesa", label: "Despesa" },
                { value: "receita", label: "Receita" },
              ]}
            />
          )}
        </Field>

        <Field label="Cor">
          <div className="color-swatches">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="swatch"
                style={{ background: preset }}
                aria-pressed={color.toUpperCase() === preset}
                aria-label={`Cor ${preset}`}
                onClick={() => setColor(preset)}
              />
            ))}
            <label
              className="swatch swatch-custom"
              aria-pressed={isCustomColor}
              title="Outra cor"
              style={isCustomColor ? { background: color, borderColor: "var(--text)" } : undefined}
            >
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Escolher outra cor" />
            </label>
          </div>
        </Field>

        <FormError message={error} />
      </div>
    </Modal>
  );
}

function DeleteCategoryDialog({ category, onClose }: { category: Category; onClose: () => void }) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const count = category.transaction_count ?? 0;

  async function handleDelete() {
    setBusy(true);
    try {
      await api.delete(`/categories/${category.id}`);
      toast("Categoria excluída");
      notifyDataChanged();
      onClose();
    } catch (err) {
      toast(getErrorMessage(err), "error");
      setBusy(false);
    }
  }

  return (
    <ChoiceDialog
      title={`Excluir "${category.name}"?`}
      description={
        count > 0
          ? `${count} ${count === 1 ? "lançamento ficará" : "lançamentos ficarão"} sem categoria e os orçamentos dela serão removidos. Os lançamentos não são apagados.`
          : "Essa categoria não tem lançamentos."
      }
      busy={busy}
      onClose={onClose}
      options={[{ label: "Excluir categoria", variant: "danger", onSelect: handleDelete }]}
    />
  );
}
