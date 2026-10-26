import type { ReactNode } from "react";
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

function ErrorIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="19" stroke={colors.feedbackDangerText} strokeWidth="3" />
      <path
        d="M22 12v12"
        stroke={colors.feedbackDangerText}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="22" cy="31" r="2.2" fill={colors.feedbackDangerText} />
    </svg>
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
      <ErrorIcon />
      <Title $color={colors.feedbackDangerText}>{title}</Title>
      <Message>{message}</Message>
      {(onRetry || back) && (
        <Actions>
          {back && <SecondaryLink to={back.to}>{back.label}</SecondaryLink>}
          {onRetry && (
            <PrimaryButton type="button" onClick={onRetry}>
              Tentar de novo
            </PrimaryButton>
          )}
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
