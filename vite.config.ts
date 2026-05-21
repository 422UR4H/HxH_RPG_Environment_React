import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
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
      ],
    },
  },
} as any);
