import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Os testes de página com vários round-trips de submit passam folgados sozinhos, mas
    // os 5s padrão ficam apertados com a suíte inteira disputando CPU.
    testTimeout: 10000,
    exclude: [
      "**/node_modules/**",
      "**/.worktrees/**",
      "**/.claude/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/pages/CampaignPage.tsx",
        "src/pages/MatchPage.tsx",
        "src/pages/CampaignsPage.tsx",
        "src/pages/PublicCampaignsPage.tsx",
        "src/pages/CharacterSheetsPage.tsx",
        "src/pages/CreateCampaignPage.tsx",
        "src/pages/CreateMatchPage.tsx",
        "src/pages/CharacterSheetPage.tsx",
        "src/features/match/**",
        "src/utils/**",
      ],
    },
  },
});
