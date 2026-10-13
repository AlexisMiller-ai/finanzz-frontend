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
  pages/             Dashboard, Lançamentos, Contas e cartões, Orçamentos, Relatórios, Categorias, Importar, Perfil, Login, Cadastro
  utils/             Datas, dinheiro, leitura de CSV/OFX, sugestão de categoria
  index.css          Design system (tokens claro/escuro, componentes, responsivo)
```

## Conceitos

- **Valores** são digitados com máscara de centavos (`123456` → `1.234,56`) e enviados como número.
- **Contas e cartões**: todo lançamento fica numa conta (dinheiro que você tem) ou num cartão (dívida que se acumula), nunca nos dois. O saldo da conta parte do saldo inicial e considera lançamentos até hoje.
- **Cartão de crédito**: `date` é o 1º dia do mês da fatura e `purchase_date` a data real da compra. Com o dia de fechamento do cartão preenchido, a fatura é sugerida automaticamente.
- **Transferência** (entre contas ou pagando a fatura) grava duas pontas ligadas: muda os saldos, mas não conta como receita nem despesa.
- **Faturas** (ícone de calendário no cartão, em Contas e cartões): lista mês a mês com a situação de cada fatura. A que ainda recebe compras é a "aberta" — depois do dia de fechamento, já é a do mês seguinte. Dar baixa tira a fatura da dívida, de três jeitos: pagando de uma conta (cria a transferência), marcando que foi paga fora do app, ou só registrando que o pagamento já estava lançado. Quem está começando com faturas antigas já pagas usa "dar baixa em todas de uma vez".
- **Ajustar saldo**: informe quanto a conta tem hoje e o saldo inicial é recalculado para bater, igual ao ajuste do total guardado.
- **Mover em lote**: em Lançamentos, "Selecionar" liga as caixas de seleção e "Mover para..." troca a conta ou o cartão de vários de uma vez (conta só vai para conta, cartão só para cartão).
- **Parcelada** divide o total em N lançamentos mensais; **Fixa mensal** repete o mesmo valor por N meses. Edição e exclusão podem valer para "só este", "este e os próximos" ou "todos".
- **Mês selecionado** fica salvo na sessão e vale para todas as telas.
- **Importação** (`/importar`): o CSV ou OFX é lido no próprio navegador (o arquivo não é enviado a lugar nenhum); só os lançamentos confirmados vão para a API. As colunas do CSV são descobertas sozinhas e a categoria é sugerida pelo histórico do usuário, com um dicionário de estabelecimentos como reserva.
- **Conciliação**: quem lança na hora não recebe duplicado. Cada linha do arquivo procura um lançamento seu com valor parecido em uma janela de dias e aparece como "você lançou: ...", com três opções — conciliar (o padrão), ignorar ou importar mesmo assim. Conciliar marca o seu lançamento como conferido, então ele não reaparece em importações futuras.
- **Relatórios** (`/relatorios`): período livre (3, 6, 12 meses, este ano ou datas escolhidas) com entradas, saídas, saldo e média mensal, cada um comparado com o período anterior de mesmo tamanho; evolução por semana (até ~3 meses) ou por mês; para onde foi e de onde veio por categoria, com fatia, média mensal e variação; os oito maiores gastos; e exportação do resumo por categoria em CSV.
- **Contas a pagar e a receber**: no formulário, o botão "Já paguei"/"Já recebi" (ligado por padrão, desligado quando a data é futura) define se o lançamento já entrou no saldo. O que está pendente ganha a etiqueta "a pagar", "a receber" ou "atrasado" na lista, tem um ✓ para dar baixa com um toque, e aparece no Dashboard em "A pagar e a receber" — vencidos primeiro, depois o que vence nos próximos 7 dias, junto com as faturas de cartão que fecharam sem baixa.
- **Instalar no celular (PWA)**: em Perfil → "Instalar no celular". Fica com ícone na tela inicial e abre em tela cheia, sem a barra do navegador (no iPhone, a instalação é pelo menu Compartilhar do Safari). O service worker (`public/sw.js`) guarda o app — index, `/assets/*` e fontes — e as respostas GET da API ficam guardadas pelo próprio app (`src/services/offlineCache.ts`), então sem internet as telas de consulta abrem com os últimos números carregados, com uma faixa avisando. Criar, editar e excluir seguem exigindo internet. Sair da conta apaga essa cópia do aparelho.
- Atalho: tecla **N** abre um novo lançamento.
