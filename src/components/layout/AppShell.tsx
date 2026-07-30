import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
  header: ReactNode;
}

const AppShell = ({ children, header }: AppShellProps) => {
  // Menu da sidebar de desktop recolhido por padrão — o conteúdo principal
  // ganha o espaço todo (pl-20, só a faixa fina do logo) até a pessoa clicar
  // pra expandir o menu (pl-64).
  const [desktopNavOpen, setDesktopNavOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar desktopNavOpen={desktopNavOpen} onToggleDesktopNav={() => setDesktopNavOpen((v) => !v)} />
      {/* No mobile, deixa espaço para a topbar fixa */}
      <div className={`${desktopNavOpen ? "lg:pl-64" : "lg:pl-20"} pt-[57px] lg:pt-0 transition-[padding] duration-300`}>
        <div className="sticky top-[57px] lg:top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
          {header}
        </div>
        <main className="px-4 sm:px-6 lg:px-10 py-6 max-w-[1500px] mx-auto animate-fade-in">
          {children}
        </main>
        <footer className="text-center py-8 text-xs text-muted-foreground border-t border-border mt-12">
          Dashboard de Relacionamento • Obra Lumen • Ser Feliz
        </footer>
      </div>
    </div>
  );
};

export default AppShell;
