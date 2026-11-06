import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { IconChevronLeft } from "../components/ui/Icons";

const ATUALIZADA_EM = "6 de novembro de 2026";
const CONTATO_URL = "https://github.com/AlexisMiller-ai";

/**
 * Aviso de privacidade (LGPD): que dados o Finanzz guarda, para quê, onde,
 * por quanto tempo e como a pessoa exerce os direitos dela. Página pública,
 * acessível sem login, porque precisa ser lida antes do cadastro.
 */
export function Privacy() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Privacidade · Finanzz";
  }, []);

  return (
    <div className="privacy-page">
      <div className="privacy-content">
        <Link to={user ? "/perfil" : "/cadastro"} className="link-btn privacy-back">
          <IconChevronLeft size={16} /> Voltar
        </Link>

        <h1>Privacidade</h1>
        <p className="muted">Atualizada em {ATUALIZADA_EM}</p>

        <p>
          O Finanzz é um app para você organizar suas próprias finanças. Este texto explica, sem rodeios,
          o que fica guardado, para quê e como apagar tudo quando quiser — como pede a Lei Geral de
          Proteção de Dados (LGPD, Lei 13.709/2018).
        </p>

        <h2>O que fica guardado</h2>
        <ul>
          <li>
            <strong>Seus dados de acesso:</strong> nome, e-mail e senha. A senha nunca é guardada como você
            digitou — só um código embaralhado (hash bcrypt) que serve para conferir o login.
          </li>
          <li>
            <strong>Foto de perfil</strong>, se você enviar uma.
          </li>
          <li>
            <strong>O que você cadastra:</strong> lançamentos, contas, cartões, faturas, categorias,
            orçamentos e metas.
          </li>
          <li>
            <strong>Extratos importados:</strong> o arquivo CSV ou OFX é lido no seu próprio navegador e não
            é enviado. Só os lançamentos que você confirma são salvos.
          </li>
          <li>
            <strong>Tentativas de login:</strong> o e-mail e o endereço IP de tentativas com senha errada,
            por até um dia, para bloquear quem tenta adivinhar senhas.
          </li>
        </ul>

        <h2>Para que esses dados são usados</h2>
        <p>
          Só para mostrar as suas finanças para você: saldos, faturas, orçamentos, relatórios. Eles são
          tratados para executar o serviço que você pediu ao criar a conta (art. 7º, V da LGPD).
        </p>
        <p>
          O Finanzz <strong>não vende, não compartilha e não usa seus dados para anúncios</strong>. Não há
          ferramentas de rastreamento, análise de comportamento nem cookies de terceiros.
        </p>

        <h2>Onde ficam</h2>
        <ul>
          <li>
            No banco de dados da <strong>Supabase</strong>, em servidores em São Paulo (Brasil), com acesso
            restrito ao próprio sistema.
          </li>
          <li>
            O app é hospedado na <strong>Vercel</strong>, por onde os dados passam a caminho do banco.
          </li>
          <li>
            No seu aparelho ficam a sessão de login, suas preferências (tema, mês selecionado) e uma cópia
            das últimas telas abertas, para o app funcionar sem internet. Essa cópia é apagada quando você
            sai da conta.
          </li>
        </ul>

        <h2>Quem vê</h2>
        <p>
          Pelo app, só você: cada conta enxerga apenas os próprios lançamentos. O responsável pelo sistema
          tem acesso técnico ao banco de dados para manutenção e não consulta seus dados fora disso.
        </p>

        <h2>Por quanto tempo</h2>
        <p>
          Enquanto a sua conta existir. Quando você exclui a conta, tudo é apagado do banco na hora: dados
          de acesso, foto, lançamentos, contas, cartões, categorias, orçamentos e metas. Não dá para
          desfazer.
        </p>

        <h2>Seus direitos</h2>
        <ul>
          <li>
            <strong>Ver e corrigir:</strong> tudo pode ser visto e editado no próprio app; nome e foto ficam
            no Perfil.
          </li>
          <li>
            <strong>Levar seus dados:</strong> exporte seus lançamentos em CSV na tela de Lançamentos e o
            resumo por categoria em Relatórios.
          </li>
          <li>
            <strong>Excluir:</strong> Perfil → <em>Excluir minha conta</em>. A exclusão é imediata.
          </li>
          <li>
            <strong>Tirar dúvidas</strong> sobre seus dados ou pedir qualquer outro direito da LGPD:{" "}
            <a href={CONTATO_URL} target="_blank" rel="noreferrer">
              fale com o responsável pelo Finanzz
            </a>
            .
          </li>
        </ul>

        <h2>Mudanças neste texto</h2>
        <p>
          Se algo mudar no que é guardado ou em como é usado, este texto é atualizado e a data no topo
          muda junto.
        </p>
      </div>
    </div>
  );
}
