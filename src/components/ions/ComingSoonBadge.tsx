import Badge from "./Badge";

/** Selo "Em breve": marca uma área que ainda não tem função, para não parecer quebrada. */
export default function ComingSoonBadge() {
  return (
    <Badge tone="comingSoon" uppercase={false}>
      Em breve
    </Badge>
  );
}
