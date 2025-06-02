import StyledCharacterSummary from "../../styles/StyledCharacterSummary";
import type { CharacterSheetSummary } from "../../types/characterSheet";

interface CharacterSummaryProps {
  character: CharacterSheetSummary;
  to: string;
}

export default function CharacterSheetCard({
  character,
  to,
}: CharacterSummaryProps) {
  return (
    <StyledCharacterSummary to={to}>
      <div className="card-content">
        <h2>{character.nickName}</h2>
        <div className="char-info">
          <p className="full-name">{character.fullName}</p>
          <p className="char-class">{character.characterClass}</p>

          <div className="status-bars">
            <div className="status-bar health">
              <span className="label">Vida:</span>
              <div
                className="bar"
                style={{ width: `${character.health.max}px`, maxWidth: "100%" }}
              >
                <div
                  className="fill"
                  style={{
                    width: `${
                      (character.health.curr / character.health.max) * 100
                    }%`,
                  }}
                />
              </div>
              <span className="value">
                {character.health.curr} / {character.health.max}
              </span>
            </div>

            <div className="status-bar stamina">
              <span className="label">Stamina:</span>
              <div
                className="bar"
                style={{
                  width: `${character.stamina.max}px`,
                  maxWidth: "100%",
                }}
              >
                <div
                  className="fill"
                  style={{
                    width: `${
                      (character.stamina.curr / character.stamina.max) * 100
                    }%`,
                  }}
                />
              </div>
              <span className="value">
                {character.stamina.curr} / {character.stamina.max}
              </span>
            </div>
          </div>
        </div>
      </div>
    </StyledCharacterSummary>
  );
}
