const browserGlobals = {
  AbortController: "readonly",
  Blob: "readonly",
  CustomEvent: "readonly",
  Document: "readonly",
  Event: "readonly",
  File: "readonly",
  FormData: "readonly",
  Headers: "readonly",
  HTMLElement: "readonly",
  HTMLInputElement: "readonly",
  HTMLSelectElement: "readonly",
  HTMLTextAreaElement: "readonly",
  IntersectionObserver: "readonly",
  MutationObserver: "readonly",
  Node: "readonly",
  ResizeObserver: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  addEventListener: "readonly",
  cancelAnimationFrame: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  crypto: "readonly",
  document: "readonly",
  fetch: "readonly",
  history: "readonly",
  localStorage: "readonly",
  location: "readonly",
  navigator: "readonly",
  performance: "readonly",
  queueMicrotask: "readonly",
  removeEventListener: "readonly",
  requestAnimationFrame: "readonly",
  sessionStorage: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
  structuredClone: "readonly",
  window: "readonly",
};

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: browserGlobals,
    },
    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^React$",
        },
      ],
    },
  },
  {
    files: ["vite.config.js"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
];
