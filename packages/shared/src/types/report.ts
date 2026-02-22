export enum ReportReason {
  SCAM = 'scam',
  EXPLICIT = 'explicit',
  TRAFFICKING = 'trafficking',
  UNDERAGE = 'underage',
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  OTHER = 'other',
}

export enum ReportStatus {
  OPEN = 'open',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  reportedListingId: string | null;
  reportedMessageId: string | null;
  reason: ReportReason;
  description: string;
  evidence: Record<string, unknown>;
  status: ReportStatus;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface SubmitReportPayload {
  reportedUserId?: string;
  reportedListingId?: string;
  reportedMessageId?: string;
  reason: ReportReason;
  description: string;
}
