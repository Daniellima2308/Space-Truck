import type { Preview } from "@storybook/react-vite";

import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "hsl(240 11% 96%)" },
        { name: "dark", value: "hsl(220 13% 8%)" },
      ],
    },
  },
};

export default preview;
