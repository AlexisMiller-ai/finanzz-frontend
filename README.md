# Finanzz — frontend

Controle de finanças pessoais: lançamentos, cartão de crédito, compras parceladas, lançamentos fixos, orçamentos por categoria e meta de economia.

React 19 + TypeScript + Vite, React Router e Recharts. Consome a API do `finanzz-backend`.

## Rodando

```bash
npm install
npm run dev
```

A URL da API vem de `VITE_API_URL` (`.env`). Para usar um backend local, crie `.env.development.local` com `VITE_API_URL=http://localhost:3333`.

## Estrutura

```
src/
  components/
    ui/              Ícones, campos (MoneyInput, Segmented...), estados vazios, barra de progresso
    Layout.tsx       Sidebar (desktop), barra inferior com botão "+" (mobile), modal global de novo lançamento
    Modal.tsx        Modal acessível + ChoiceDialog (confirmações com várias opções)
    TransactionForm.tsx
  contexts/
    AuthContext      Sessão do usuário
    AppContext       Mês selecionado (compartilhado entre telas), tema, dataVersion e modal de novo lançamento
    ToastContext     Notificações
  hooks/
    useFetch         GET com recarga automática quando algum dado é salvo (dataVersion)
    useThemeColors   Lê tokens CSS para os gráficos
  pages/             Dashboard, Lançamentos, Orçamentos, Categorias, Importar, Perfil, Login, Cadastro
  utils/             Datas, dinheiro, leitura de CSV/OFX, sugestão de categoria, preferências locais
  index.css          Design system (tokens claro/escuro, componentes, responsivo)
```

## Conceitos

- **Valores** são digitados com máscara de centavos (`123456` → `1.234,56`) e enviados como número.
- **Cartão de crédito**: `date` é o 1º dia do mês da fatura e `purchase_date` a data real da compra. Com o dia de fechamento configurado no Perfil, a fatura é sugerida automaticamente.
- **Parcelada** divide o total em N lançamentos mensais; **Fixa mensal** repete o mesmo valor por N meses. Edição e exclusão podem valer para "só este", "este e os próximos" ou "todos".
- **Mês selecionado** fica salvo na sessão e vale para todas as telas.
- **Importação** (`/importar`): o CSV ou OFX é lido no próprio navegador (o arquivo não é enviado a lugar nenhum); só os lançamentos confirmados vão para a API. As colunas do CSV são descobertas sozinhas e a categoria é sugerida pelo histórico do usuário, com um dicionário de estabelecimentos como reserva.
- Atalho: tecla **N** abre um novo lançamento.
