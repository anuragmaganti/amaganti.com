import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", "playwright-report/**", "test-results/**"]),
  {
    files: ["components/scene-canvas.tsx"],
    rules: {
      // React's immutability rule cannot model react-three-fiber's imperative frame loop.
      "react-hooks/immutability": "off",
    },
  },
]);
