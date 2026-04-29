// Configuração conservadora para Stylelint no Space Truck.
// O projeto usa Tailwind CSS, então diretivas como @tailwind, @layer e @apply são permitidas.

export default {
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["tailwind", "apply", "layer", "screen", "config", "container"],
      },
    ],
    "block-no-empty": true,
    "color-no-invalid-hex": true,
    "declaration-block-no-duplicate-properties": [
      true,
      {
        ignore: ["consecutive-duplicates-with-different-values"],
      },
    ],
    "font-family-no-duplicate-names": true,
    "function-calc-no-unspaced-operator": true,
    "media-feature-name-no-unknown": true,
    // Tailwind layers/utilities can make selector order noisy; keep this disabled until CSS linting is validated on the full stylesheet.
    "no-descending-specificity": null,
    "no-duplicate-selectors": true,
    // Some generated or placeholder CSS entrypoints can be intentionally empty during tooling checks.
    "no-empty-source": null,
    "property-no-unknown": true,
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global", "local"],
      },
    ],
    "selector-pseudo-element-no-unknown": true,
    "string-no-newline": true,
    "unit-no-unknown": true,
  },
};
