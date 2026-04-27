export type AppNoticeTone = "info" | "success" | "warning" | "danger";

export type AppNotice = {
  title?: string;
  description?: string;
  tone?: AppNoticeTone;
};

type AppNoticeInput = AppNotice | null | undefined;

export function createAppNotice(input?: AppNoticeInput): AppNotice | null {
  if (!input) {
    return null;
  }

  return {
    title: input.title,
    description: input.description,
    tone: input.tone ?? "info",
  };
}

export function getAppNotice(input?: AppNoticeInput): AppNotice | null {
  return createAppNotice(input);
}

export const DEFAULT_APP_NOTICE: AppNotice | null = null;
