import type { ReactNode } from "react";
import ErrorIcon from "../ions/ErrorIcon";
import PageHeader from "../atoms/PageHeader";
import BackButton from "../ions/BackButton";
import useDelayedFlag from "../../hooks/useDelayedFlag";
import { SERVER_WAKING_HINT } from "../../services/serverWake";
import { colors } from "../../styles/tokens";
import {
  Actions,
  Card,
  Hint,
  Label,
  Message,
  PrimaryButton,
  PrimaryLink,
  SecondaryLink,
  Shell,
  Spinner,
  Stage,
  Title,
} from "./PageState.styles";

export type PageBackdrop = "world" | "sheet";
export type PageStateLink = { label: string; to: string };

interface FrameProps {
  backdrop?: PageBackdrop;
  /** Com cor, a moldura é sempre o PageHeader nela; sem, vale a moldura da família. */
  headerColor?: string;
}

const DEFAULT_ERROR_MESSAGE = "Verifique a conexão e tente de novo.";
const WAKING_HINT_DELAY_MS = 3000;

function Frame({
  backdrop = "world",
  headerColor,
  role,
  children,
}: FrameProps & { role?: "status" | "alert"; children: ReactNode }) {
  let header: ReactNode;
  if (headerColor) header = <PageHeader backgroundColor={headerColor} />;
  else if (backdrop === "world") header = <PageHeader backgroundColor={colors.brandPrimary} />;
  else header = <BackButton />;

  return (
    <Shell>
      {header}
      <Stage $family={backdrop}>
        <Card
          $family={backdrop}
          role={role}
          aria-live={role === "status" ? "polite" : undefined}
        >
          {children}
        </Card>
      </Stage>
    </Shell>
  );
}

export function PageLoading({ label, ...frame }: { label: string } & FrameProps) {
  const waking = useDelayedFlag(WAKING_HINT_DELAY_MS);
  return (
    <Frame {...frame} role="status">
      <Spinner aria-hidden="true" />
      <Label>{label}</Label>
      {waking && <Hint>{SERVER_WAKING_HINT}</Hint>}
    </Frame>
  );
}

export function PageError({
  title,
  message = DEFAULT_ERROR_MESSAGE,
  onRetry,
  back,
  ...frame
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  back?: PageStateLink;
} & FrameProps) {
  return (
    <Frame {...frame} role="alert">
      <span style={{ display: "flex", color: colors.feedbackDangerText }}>
        <ErrorIcon size={44} />
      </span>
      <Title $color={colors.feedbackDangerText}>{title}</Title>
      <Message>{message}</Message>
      {(onRetry || back) && (
        <Actions>
          {onRetry && (
            <PrimaryButton type="button" onClick={onRetry}>
              Tentar de novo
            </PrimaryButton>
          )}
          {back && <SecondaryLink to={back.to}>{back.label}</SecondaryLink>}
        </Actions>
      )}
    </Frame>
  );
}

export function PageNotFound({
  title,
  message,
  back,
  ...frame
}: {
  title: string;
  message?: string;
  back: PageStateLink;
} & FrameProps) {
  return (
    <Frame {...frame}>
      <Title $color={colors.textPrimary}>{title}</Title>
      {message && <Message>{message}</Message>}
      <Actions>
        <PrimaryLink to={back.to}>{back.label}</PrimaryLink>
      </Actions>
    </Frame>
  );
}
