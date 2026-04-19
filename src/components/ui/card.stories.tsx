import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SummaryBlock: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
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
