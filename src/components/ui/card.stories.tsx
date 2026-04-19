import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const meta = {
  title: "Foundation/Data Display/Card",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SummaryBlock: Story = {
  render: () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Viagem BR-116</CardTitle>
          <Badge variant="secondary">Hoje</Badge>
        </div>
        <CardDescription>Status rápido da operação.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Parada prevista em 45 min • 320 km restantes</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Ver detalhes</Button>
      </CardFooter>
    </Card>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sem viagem ativa</CardTitle>
        <CardDescription>Quando você iniciar uma rota, o resumo aparece aqui.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="outline" size="sm">
          Criar viagem
        </Button>
      </CardFooter>
    </Card>
  ),
};
