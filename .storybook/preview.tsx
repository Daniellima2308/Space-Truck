import type { Preview } from "@storybook/react-vite";

import "../src/index.css";

const preview: Preview = {
  decorators: [
    (Story) => {
      document.documentElement.classList.add("dark");

      return (
        <div className="dark min-h-screen bg-background px-3 py-4 text-foreground sm:px-6">
          <div className="mx-auto w-full max-w-sm sm:max-w-md">
            <Story />
          </div>
        </div>
      );
    },
  ],
  parameters: {
    options: {
      storySort: {
        order: ["Foundation", "Components"],
      },
    },
    controls: {
      expanded: true,
      sort: "requiredFirst",
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    backgrounds: {
      default: "dark-app",
      values: [
        { name: "dark-app", value: "hsl(222 14% 11%)" },
        { name: "light-app", value: "hsl(240 11% 96%)" },
      ],
    },
    docs: {
      source: {
        state: "open",
      },
    },
    chromatic: {
      pauseAnimationAtEnd: true,
    },
  },
};

export default preview;
