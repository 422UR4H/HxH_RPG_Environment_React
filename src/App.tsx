import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import CharacterSheetsPage from "./pages/CharacterSheetsPage";
import CreateCampaignPage from "./pages/CreateCampaignPage";
import CampaignsPage from "./pages/CampaignsPage";
import CampaignPage from "./pages/CampaignPage";
import CreateMatchPage from "./pages/CreateMatchPage";
import MatchPage from "./pages/MatchPage";
import CharacterSheetPage from "./pages/CharacterSheetPage";
import CreateCharacterSheetPage from "./pages/CreateCharacterSheetPage";
import PublicCampaignsPage from "./pages/PublicCampaignsPage";
import EditCharacterSheetPage from "./pages/EditCharacterSheetPage";
import CreateNpcPage from "./pages/CreateNpcPage";
import EditMatchPage from "./pages/EditMatchPage";
import EditCampaignPage from "./pages/EditCampaignPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/sign-up" element={<RegisterPage />} />

        <Route path="/home" element={<HomePage />} />
        <Route path="/charactersheets" element={<CharacterSheetsPage />} />
        <Route
          path="/charactersheet/new"
          element={<CreateCharacterSheetPage />}
        />
        <Route path="/charactersheet/:id" element={<CharacterSheetPage />} />
        <Route
          path="/charactersheet/:id/edit"
          element={<EditCharacterSheetPage />}
        />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/public" element={<PublicCampaignsPage />} />
        <Route path="/campaigns/new" element={<CreateCampaignPage />} />
        <Route path="/campaigns/:id" element={<CampaignPage />} />
        <Route path="/campaigns/:id/edit" element={<EditCampaignPage />} />
        <Route
          path="/campaigns/:campaignId/npcs/new"
          element={<CreateNpcPage />}
        />
        <Route
          path="/campaigns/:campaignId/matches/new"
          element={<CreateMatchPage />}
        />
        <Route
          path="/campaigns/:campaignId/matches/:matchId"
          element={<MatchPage />}
        />
        <Route
          path="/campaigns/:campaignId/matches/:matchId/edit"
          element={<EditMatchPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
