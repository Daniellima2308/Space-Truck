import type { Meta, StoryObj } from "@storybook/react-vite";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const meta = {
  title: "Foundation/Forms/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="diesel-s10">
      <SelectTrigger>
        <SelectValue placeholder="Selecione o combustível" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="diesel-s10">Diesel S10</SelectItem>
        <SelectItem value="diesel-s500">Diesel S500</SelectItem>
        <SelectItem value="aditivo">Arla 32</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select defaultValue="diesel-s10" disabled>
      <SelectTrigger>
        <SelectValue placeholder="Selecione o combustível" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="diesel-s10">Diesel S10</SelectItem>
        <SelectItem value="diesel-s500">Diesel S500</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const OpenForReview: Story = {
  render: () => (
    <Select defaultValue="sudeste" open onOpenChange={() => undefined}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione a região" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sudeste">Sudeste</SelectItem>
        <SelectItem value="sul">Sul</SelectItem>
        <SelectItem value="centro-oeste">Centro-Oeste</SelectItem>
      </SelectContent>
    </Select>
  ),
};
