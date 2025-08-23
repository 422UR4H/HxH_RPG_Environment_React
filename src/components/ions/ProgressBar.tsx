import styled from "styled-components";

interface ProgressBarProps {
  current: number;
  max: number;
  min?: number;
  // label?: string;
  color: string;
  backgroundColor?: string;
  height?: string;
}

export default function ProgressBar({
  current,
  max,
  min = 0,
  // label = "",
  color,
  backgroundColor = "#444",
  height,
}: ProgressBarProps) {
  const percentage = Math.max(((current - min) / (max - min)) * 100, 0);

  return (
    <ProgressBarContainer>
      {/* {label && (
        <Label>
          {label}: {current}/{max}
        </Label>
      )} */}
      <BarBackground backgroundColor={backgroundColor} height={height}>
        <BarFill percentage={percentage} color={color} height={height}>
          <ValuesInside>
            {current}/{max}
          </ValuesInside>
        </BarFill>
      </BarBackground>
    </ProgressBarContainer>
  );
}

const ProgressBarContainer = styled.div`
  /* container-type: inline-size; */
  width: 100%;
  border: 3px solid black;

  @media(max-width: 609px) {
    border-width: 0.6cqi;
  }
`;

// const Label = styled.span`
//   font-family: "Oswald", sans-serif;
//   font-size: 14px;
//   color: white;
//   display: block;
//   margin-bottom: 4px;
// `;

const BarBackground = styled.div<{
  backgroundColor: string;
  height?: string;
}>`
  width: 100%;
  height: ${({ height }) => height || "3.8cqi"};
  background-color: ${({ backgroundColor }) => backgroundColor};
  /* border-radius: 4px; */
  overflow: hidden;
  position: relative;
`;

const BarFill = styled.div<{
  percentage: number;
  color: string;
  height?: string;
}>`
  width: ${({ percentage }) => percentage}%;
  height: ${({ height }) => height || "3.8cqi"};
  background-color: ${({ color }) => color};
  transition: width 0.3s ease;
  position: relative;

  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;

  /* ${({ percentage }) =>
    percentage < 20 && `animation: pulse 1.5s infinite;`} */
`;

const ValuesInside = styled.span`
  font-family: "Oswald", sans-serif;
  font-size: 3.8cqi;
  text-align: center;
  font-weight: 600;
  color: black;
  padding-top: 1px;
`;
