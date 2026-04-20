import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Foundation/Data Display/Card",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultSurface: Story = {
  render: () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Resumo da viagem</CardTitle>
        <CardDescription>Componente base de superfície para blocos de conteúdo.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Use em combinação com header, conteúdo e ações no footer.</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Ver histórico</Button>
      </CardFooter>
    </Card>
  ),
};

export const GradientSurface: Story = {
  render: () => (
    <Card className="w-full max-w-sm gradient-card border-border/70">
      <CardHeader>
        <CardTitle>Superfície com gradiente</CardTitle>
        <CardDescription>Variação visual usada em cards do app.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Ideal para destacar contexto operacional sem perder contraste.</p>
      </CardContent>
    </Card>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Nenhum dado disponível</CardTitle>
        <CardDescription>Estado vazio para listas ou blocos sem registros.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="outline" size="sm">
          Tentar novamente
        </Button>
      </CardFooter>
    </Card>
  ),
};
