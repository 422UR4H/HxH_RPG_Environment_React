import { Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import type { SheetMode } from "../features/sheet/types/sheetMode";
import { useCharacterSheet } from "../hooks/useCharacterSheet";
import { useAcceptSheetSubmission } from "../hooks/useAcceptSheetSubmission";
import { useRejectSheetSubmission } from "../hooks/useRejectSheetSubmission";
import { useDeleteCharacterSheet } from "../hooks/useDeleteCharacterSheet";

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
  const { mutate: deleteSheet } = useDeleteCharacterSheet(token);

  if (!token || !id) {
    return <Navigate to="/" replace />;
  }

  const isOwner = !!charSheet && !!user && charSheet.playerUuid === user.uuid;
  const isFree = isOwner && !!charSheet && !charSheet.campaignUuid && !charSheet.submission;

  const activeCampaignUuid =
    charSheet?.campaignUuid ?? charSheet?.submission?.campaignUuid;

  const handleCampaignClick = () => {
    if (activeCampaignUuid) {
      navigate(`/campaigns/${activeCampaignUuid}`);
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

  const handleEdit = () => {
    if (!charSheet?.uuid) return;
    navigate(`/charactersheet/${charSheet.uuid}/edit`);
  };

  const handleDelete = () => {
    if (!charSheet?.uuid) return;
    deleteSheet(charSheet.uuid, {
      onSuccess: () => navigate("/", { replace: true }),
    });
  };

  return (
    <CharacterSheetTemplate
      sheetMode={sheetMode}
      data={{
        charSheet,
        isLoading,
        error: error ? error.message : null,
        onCampaignClick: isOwner && charSheet ? handleCampaignClick : undefined,
        hasCampaign: !!activeCampaignUuid,
        onAcceptSubmission: !isOwner && isPending && !accepting ? handleAccept : undefined,
        onRejectSubmission: !isOwner && isPending && !rejecting ? handleReject : undefined,
        manage: isOwner ? { isFree, onEdit: handleEdit, onDelete: handleDelete } : undefined,
      }}
    />
  );
}

export default CharacterSheetPage;
