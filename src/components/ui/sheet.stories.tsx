import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const meta = {
  title: "Components/Overlay/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: {
    mobileFrame: false,
  },
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RightPanelOpen: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetContent side="right" className="w-[320px]">
        <SheetHeader>
          <SheetTitle>Filtros de viagem</SheetTitle>
          <SheetDescription>Ajuste período, status e tipo de carga.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>Período: últimos 7 dias</p>
          <p>Status: em rota</p>
          <p>Tipo: carga seca</p>
        </div>
        <SheetFooter className="mt-6">
          <Button size="sm">Aplicar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const BottomSheetOpen: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-lg">
        <SheetHeader>
          <SheetTitle>Parada sugerida</SheetTitle>
          <SheetDescription>Você está dirigindo há 4h15. Considere uma pausa.</SheetDescription>
        </SheetHeader>
        <SheetFooter className="mt-4">
          <Button size="sm">Entendi</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const WithTrigger: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Ver filtros</Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px]">
        <SheetHeader>
          <SheetTitle>Filtros de viagem</SheetTitle>
          <SheetDescription>Abrir via trigger para comportamento padrão de uso.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};
