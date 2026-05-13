import styled from "styled-components";

type EnrollmentStatus = "pending" | "accepted" | "rejected";

interface EnrollmentStatusBadgeProps {
  status: EnrollmentStatus;
}

const labels: Record<EnrollmentStatus, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  rejected: "Rejeitado",
};

export default function EnrollmentStatusBadge({ status }: EnrollmentStatusBadgeProps) {
  return <Badge $status={status}>{labels[status]}</Badge>;
}

const Badge = styled.span<{ $status: EnrollmentStatus }>`
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
  background-color: ${({ $status }) =>
    $status === "pending"
      ? "#3498db"
      : $status === "accepted"
      ? "#2ecc71"
      : "#e74c3c"};
  color: white;
`;
