import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { IncomePage } from "./pages/IncomePage";
import { MortgagePage } from "./pages/MortgagePage";
import { AssetsPage } from "./pages/AssetsPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { ProjectionPage } from "./pages/ProjectionPage";
import { TaxConfigPage } from "./pages/TaxConfigPage";

const LEGACY_ROUTES = [
  ["/index.html", "/"],
  ["/income.html", "/income"],
  ["/mortgage.html", "/mortgage"],
  ["/savings.html", "/assets"],
  ["/expenses.html", "/expenses"],
  ["/projection.html", "/projection"],
  ["/tax-config.html", "/taxes"],
];

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/income" element={<IncomePage />} />
      <Route path="/mortgage" element={<MortgagePage />} />
      <Route path="/assets" element={<AssetsPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/projection" element={<ProjectionPage />} />
      <Route path="/taxes" element={<TaxConfigPage />} />
      {LEGACY_ROUTES.map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
