import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import CharacterSheetsPage from "./pages/CharacterSheetsPage";
import CharacterSheetsDetailPage from "./pages/CharacterSheetsDetailPage";
import CampaignsListPage from "./pages/CampaignsListPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/sign-up" element={<RegisterPage />} />

        <Route path="/home" element={<HomePage />} />
        <Route path="/charactersheets" element={<CharacterSheetsPage />} />
        <Route path="/charactersheets/:id" element={<CharacterSheetsDetailPage />} />
        {/* TODO: fix name */}
        <Route path="/campaigns" element={<CampaignsListPage />} /> 
      </Routes>
    </BrowserRouter>
  );
}
export default App;
