import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import CharacterSheetsPage from "./pages/CharacterSheetsPage";
import CharacterSheetsDetailPage from "./pages/CharacterSheetsDetailPage";
import CreateCampaignPage from "./pages/CreateCampaignPage";
import CampaignsPage from "./pages/CampaignsPage";
import CampaignPage from "./pages/CampaignPage";
import CreateMatchPage from "./pages/CreateMatchPage";
import CharacterSheetPage from "./pages/CharacterSheetPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/sign-up" element={<RegisterPage />} />

        <Route path="/home" element={<HomePage />} />
        <Route path="/charactersheets" element={<CharacterSheetsPage />} />
        <Route
          path="/charactersheets/:id"
          element={<CharacterSheetsDetailPage />}
        />
        <Route
          path="/charactersheet/:id"
          element={<CharacterSheetPage />}
        />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:id" element={<CampaignPage />} />
        <Route path="/campaigns/new" element={<CreateCampaignPage />} />
        <Route
          path="/campaigns/:campaignId/matches/new"
          element={<CreateMatchPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
