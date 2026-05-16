import { Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import type { SheetMode } from "../features/sheet/types/sheetMode";
import { useCharacterSheet } from "../hooks/useCharacterSheet";
import { useAcceptSheetSubmission } from "../hooks/useAcceptSheetSubmission";
import { useRejectSheetSubmission } from "../hooks/useRejectSheetSubmission";

function CharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as { isPending?: boolean; campaignId?: string } | null);
  const isPending = locationState?.isPending ?? false;
  const campaignId = locationState?.campaignId;

  const sheetMode: SheetMode = {
    headerMode: "view",
    profileMode: "view",
    diagramsMode: "view",
    proficiencyMode: "view",
    skillsMode: "view",
  };

  const { data: charSheet, isLoading, error } = useCharacterSheet(token, id);
  const { mutate: acceptSubmission, isPending: accepting } = useAcceptSheetSubmission(token, campaignId);
  const { mutate: rejectSubmission, isPending: rejecting } = useRejectSheetSubmission(token, campaignId);

  if (!token || !id) {
    return <Navigate to="/" replace />;
  }

  const isOwner = !!charSheet && !!user && charSheet.playerUuid === user.uuid;

  const handleCampaignClick = () => {
    if (charSheet?.campaignUuid) {
      navigate(`/campaigns/${charSheet.campaignUuid}`);
    } else {
      navigate("/campaigns/public", { state: { sheetId: id } });
    }
  };

  const handleAccept = () => {
    if (!id) return;
    acceptSubmission(id, { onSuccess: () => campaignId && navigate(`/campaigns/${campaignId}`) });
  };

  const handleReject = () => {
    if (!id) return;
    rejectSubmission(id, { onSuccess: () => campaignId && navigate(`/campaigns/${campaignId}`) });
  };

  return (
    <CharacterSheetTemplate
      sheetMode={sheetMode}
      data={{
        charSheet,
        isLoading,
        error: error ? error.message : null,
        onCampaignClick: isOwner && charSheet ? handleCampaignClick : undefined,
        hasCampaign: !!charSheet?.campaignUuid,
        onAcceptSubmission: !isOwner && isPending && !accepting ? handleAccept : undefined,
        onRejectSubmission: !isOwner && isPending && !rejecting ? handleReject : undefined,
      }}
    />
  );
}

export default CharacterSheetPage;
