import styled from "styled-components";
import { colors } from "../../styles/tokens";

/** Selo "Em breve": marca uma área que ainda não tem função, para não parecer quebrada. */
export default function ComingSoonBadge() {
  return <Badge>Em breve</Badge>;
}

const Badge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid ${colors.statusComingSoon};
  border-radius: 999px;
  color: ${colors.statusComingSoon};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
`;
