import type { Meta, StoryObj } from "@storybook/react-vite";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FontAwesomeIcon, iconLightbulb, iconLock, iconLogOut, iconMenu, iconMessageCircle, iconUser, iconWallet, iconWrench } from "@/lib/icons";

const meta = {
  title: "Foundation/Overlay/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: {
    mobileFrame: false,
  },
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

type MenuItemProps = {
  label: string;
  icon: Parameters<typeof FontAwesomeIcon>[0]["icon"];
};

const MenuItem = ({ icon, label }: MenuItemProps) => (
  <button
    type="button"
    className="w-full rounded-lg p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
  >
    <FontAwesomeIcon icon={icon} className="w-5 h-5 text-muted-foreground" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const MenuContent = () => (
  <SheetContent side="right" className="w-72 bg-card border-border p-0">
    <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-border">
      <h2 className="text-lg font-bold">Menu</h2>
    </div>
    <nav className="px-3 py-4 space-y-1">
      <MenuItem icon={iconUser} label="Meu Perfil" />
      <MenuItem icon={iconLock} label="Alterar Senha" />
      <MenuItem icon={iconWrench} label="Manutenção" />
      <MenuItem icon={iconWallet} label="Gastos Pessoais" />
      <MenuItem icon={iconMessageCircle} label="Suporte" />
      <MenuItem icon={iconLightbulb} label="Sugestões" />
    </nav>
    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
      <button
        type="button"
        className="w-full bg-expense/10 hover:bg-expense/20 text-expense rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors"
      >
        <FontAwesomeIcon icon={iconLogOut} className="w-4 h-4" /> Sair da Conta
      </button>
    </div>
  </SheetContent>
);

export const HamburgerMenuOpen: Story = {
  render: () => (
    <Sheet defaultOpen>
      <MenuContent />
    </Sheet>
  ),
};

export const HamburgerMenuWithTrigger: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button" className="p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Menu">
          <FontAwesomeIcon icon={iconMenu} className="w-6 h-6" />
        </button>
      </SheetTrigger>
      <MenuContent />
    </Sheet>
  ),
};
