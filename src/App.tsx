import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Budgets } from "./pages/Budgets";
import { Categories } from "./pages/Categories";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transacoes" element={<Transactions />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/metas" element={<Budgets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
