import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { NavGuardProvider } from "./contexts/NavGuardContext";
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
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";
const TacticalMapDemoPage = lazy(() => import("./pages/TacticalMapDemoPage"));
const CreateMapPage = lazy(() => import("./pages/CreateMapPage"));
const EditMapPage = lazy(() => import("./pages/EditMapPage"));

function App() {
  return (
    <NavGuardProvider>
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
        <Route
          path="/campaigns/:campaignId/matches/:matchId/lobby"
          element={<LobbyPage />}
        />
        <Route
          path="/campaigns/:campaignId/matches/:matchId/game"
          element={<GamePage />}
        />
        <Route
          path="/campaigns/:campaignId/maps/new"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <CreateMapPage />
            </Suspense>
          }
        />
        <Route
          path="/campaigns/:campaignId/maps/:mapId/edit"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <EditMapPage />
            </Suspense>
          }
        />
        {import.meta.env.DEV && (
          <Route
            path="/dev/tactical-map-demo"
            element={
              <Suspense fallback={<div>Loading map demo…</div>}>
                <TacticalMapDemoPage />
              </Suspense>
            }
          />
        )}
        </Routes>
      </BrowserRouter>
    </NavGuardProvider>
  );
}
export default App;
