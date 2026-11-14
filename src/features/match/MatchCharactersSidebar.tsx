// src/features/match/MatchCharactersSidebar.tsx
import type { ReactNode, RefObject } from "react";
import styled from "styled-components";
import type { Enrollment, Participant } from "../../types/match";
import CharactersSidebar from "../../components/organisms/CharactersSidebar";
import CharacterSidebarItem from "../../components/molecules/CharacterSidebarItem";
import EnrollmentSidebarItem from "./EnrollmentSidebarItem";
import { toSidebarCharacter } from "./sidebarCharacter";
import { useCardDragGesture } from "./useCardDragGesture";
import type { CardDragPoint } from "./cardDragGesture";

interface MatchCharactersSidebarProps {
  gameStarted: boolean;
  enrollments: Enrollment[];
  participants: Participant[];
  isMaster: boolean;
  actionLoading: Record<string, boolean>;
  onAccept: (enrollmentId: string) => void;
  onReject: (enrollmentId: string) => void;
  onSelectCharacterSheet: (sheetUuid: string) => void;
  ownPlayerUuid?: string;
  /** Cards na largura toda do painel (a aba Personagens da mesa). */
  fluid?: boolean;
  /** Depois dos cards, dentro da lista (ex.: "Adicionar à partida" do mestre). */
  footer?: ReactNode;
  /** Fichas (uuid) de quem participa e não tem peça no tabuleiro: ganham o selo e podem ser arrastadas ao mapa (mestre). */
  offBoardIds?: Set<string>;
  /** O mestre começou a arrastar o card de um participante fora do mapa; `point` é onde está o ponteiro. */
  onCardDragStart?: (participant: Participant, point: CardDragPoint) => void;
  /** O elemento da lista, para saber se uma peça foi solta sobre ela. */
  containerRef?: RefObject<HTMLDivElement | null>;
  /** Realça a lista como alvo de soltura (peça sendo arrastada para fora do mapa). */
  isDropTarget?: boolean;
}

export default function MatchCharactersSidebar({
  gameStarted,
  enrollments,
  participants,
  isMaster,
  actionLoading,
  onAccept,
  onReject,
  onSelectCharacterSheet,
  ownPlayerUuid,
  fluid,
  footer,
  offBoardIds,
  onCardDragStart,
  containerRef,
  isDropTarget,
}: MatchCharactersSidebarProps) {
  if (!gameStarted) {
    return (
      <CharactersSidebar
        fluid={fluid}
        footer={footer}
        containerRef={containerRef}
        isDropTarget={isDropTarget}
        items={enrollments}
        renderItem={(enrollment) => (
          <EnrollmentSidebarItem
            key={enrollment.uuid}
            enrollment={enrollment}
            isMaster={isMaster}
            isLoading={!!actionLoading[enrollment.uuid]}
            onAccept={onAccept}
            onReject={onReject}
            onClick={() => onSelectCharacterSheet(enrollment.characterSheet.uuid)}
          />
        )}
      />
    );
  }

  return (
    <CharactersSidebar
      fluid={fluid}
      footer={footer}
      containerRef={containerRef}
      isDropTarget={isDropTarget}
      items={participants}
      renderItem={(participant) => {
        const offBoard =
          isMaster && !participant.leftAt && !!offBoardIds?.has(participant.characterSheet.uuid);
        return (
          <DraggableCard
            key={participant.uuid}
            participant={participant}
            draggable={offBoard && !!onCardDragStart}
            onDragStart={onCardDragStart}
          >
            <CharacterSidebarItem
              character={toSidebarCharacter(participant.characterSheet)}
              isMaster={isMaster}
              isOwn={!!ownPlayerUuid && participant.characterSheet.playerUuid === ownPlayerUuid}
              hasLeft={!!participant.leftAt}
              offBoard={offBoard}
              onClick={() => onSelectCharacterSheet(participant.characterSheet.uuid)}
            />
          </DraggableCard>
        );
      }}
    />
  );
}

// Um hook por card: o wrapper existe só para o gesto, sem mexer no layout da lista.
function DraggableCard({
  participant,
  draggable,
  onDragStart,
  children,
}: {
  participant: Participant;
  draggable: boolean;
  onDragStart?: (participant: Participant, point: CardDragPoint) => void;
  children: ReactNode;
}) {
  const gesture = useCardDragGesture({
    enabled: draggable,
    onDragStart: (point) => onDragStart?.(participant, point),
  });
  return (
    <CardWrapper $draggable={draggable} {...gesture}>
      {children}
    </CardWrapper>
  );
}

const CardWrapper = styled.div<{ $draggable: boolean }>`
  ${({ $draggable }) =>
    $draggable &&
    `
    -webkit-touch-callout: none;
    user-select: none;
    -webkit-user-select: none;
  `}
`;
