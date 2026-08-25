import next from "@dlv/eslint-config/next";

export default [
  {
    ignores: [
      ".next/**",
      "public/sw.js",
      "public/sw.js.map",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...next,
];
