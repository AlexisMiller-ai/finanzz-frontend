import { useEffect, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { registrarServiceWorker, useOnline } from "../utils/pwa";
import { IconAlert } from "./ui/Icons";

/**
 * Parte "instalável" do app: registra o service worker, avisa quando chega uma
 * versão nova e mostra uma faixa quando a internet cai — aí o que está na tela
 * veio do que ficou guardado da última visita.
 */
export function PwaManager() {
  const toast = useToast();
  const [temAtualizacao, setTemAtualizacao] = useState(false);

  useEffect(() => {
    registrarServiceWorker(() => setTemAtualizacao(true));
  }, []);

  useEffect(() => {
    if (temAtualizacao) toast("Nova versão disponível. Recarregue a página para usar.");
  }, [temAtualizacao, toast]);

  return null;
}

/** Faixa no topo do conteúdo: o que está na tela veio do que já estava guardado. */
export function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offline-bar" role="status">
      <IconAlert size={14} />
      <span>Sem conexão — mostrando os últimos dados carregados.</span>
    </div>
  );
}
