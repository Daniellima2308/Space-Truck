import type { Preview } from "@storybook/react-vite";

import "../src/index.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Tema global",
      toolbar: {
        icon: "mirror",
        dynamicTitle: true,
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === "light" ? "light" : "dark";
      const mobileFrame = context.parameters.mobileFrame !== false;

      return (
        <div className={theme === "dark" ? "dark" : undefined}>
          <div className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-6">
            {mobileFrame ? (
              <div className="mx-auto w-full max-w-sm sm:max-w-md">
                <Story />
              </div>
            ) : (
              <Story />
            )}
          </div>
        </div>
      );
    },
  ],
  initialGlobals: {
    theme: "dark",
    backgrounds: {
      value: "dark-app",
    },
  },
  parameters: {
    options: {
      storySort: {
        order: ["Foundation", "Components", "App Patterns"],
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
    layout: "fullscreen",
    backgrounds: {
      options: {
        "dark-app": { name: "dark-app", value: "hsl(222 14% 11%)" },
        "light-app": { name: "light-app", value: "hsl(240 11% 96%)" },
      },
    },
    docs: {
      source: {
        state: "open",
      },
    },
    chromatic: {
      pauseAnimationAtEnd: true,
    },
    mobileFrame: true,
  },
};

export default preview;
