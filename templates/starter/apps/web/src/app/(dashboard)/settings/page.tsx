'use client';

/**
 * Settings placeholder.
 *
 * A tela de configurações real (white-label + i18n + branding por tenant)
 * é entregue no prompt #18 (settings module). Por ora, este placeholder
 * existe pra validar a navegação do dropdown de usuário e o item de sidebar.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-bold">Configurações</h1>
      <p className="text-muted-foreground">
        Tela de configurações será implementada no prompt #18 (settings module — white-label + i18n
        + branding por tenant).
      </p>
    </div>
  );
}
