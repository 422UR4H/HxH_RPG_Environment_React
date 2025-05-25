import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import CharacterSheetsPage from "./pages/CharacterSheetsPage";
import CampaignsPage from "./pages/CampaignsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/sign-up" element={<RegisterPage />} />

        <Route path="/home" element={<HomePage />} />
        <Route path="/character-sheets" element={<CharacterSheetsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
