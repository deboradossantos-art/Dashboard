import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PasswordGate from "./components/PasswordGate";
import { DashboardDataProvider } from "./contexts/DashboardDataContext";

const queryClient = new QueryClient();
const Index = lazy(() => import("./pages/Index"));
const IndicadoresDetalhados = lazy(() => import("./pages/IndicadoresDetalhados"));
const Funcionarias = lazy(() => import("./pages/Funcionarias"));
const Upload = lazy(() => import("./pages/Upload"));
const Historico = lazy(() => import("./pages/Historico"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">
    Carregando...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PasswordGate>
          <DashboardDataProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/indicadores-detalhados" element={<IndicadoresDetalhados />} />
                <Route path="/funcionarias" element={<Funcionarias />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/historico" element={<Historico />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </DashboardDataProvider>
        </PasswordGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
