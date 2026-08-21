import AppShell from "@/components/layout/AppShell";

/**
 * Página em branco para o "Hub Central" — conteúdo a definir.
 */
const HubCentral = () => {
  const header = (
    <div className="px-4 sm:px-6 lg:px-10 py-5">
      <h1 className="text-xl font-bold text-foreground">Hub Central</h1>
    </div>
  );

  return (
    <AppShell header={header}>
      <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        Conteúdo do Hub Central em breve.
      </div>
    </AppShell>
  );
};

export default HubCentral;
