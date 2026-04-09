"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/crm/ui/Card";

interface EmailLog {
  id: string;
  beschrijving: string;
  created_at: string;
  user: { full_name: string } | null;
  metadata: {
    subject?: string;
    from?: string;
    to?: string;
    date?: string;
    messageId?: string;
    direction?: "sent" | "received";
  } | null;
}

interface Props {
  klantId?: string;
  kandidaatId?: string;
}

const PAGE_SIZE = 20;

export function EmailLogTab({ klantId, kandidaatId }: Props) {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchEmails = useCallback(async (currentOffset: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: "email",
        limit: String(PAGE_SIZE + 1),
        offset: String(currentOffset),
      });
      if (klantId) params.set("klant_id", klantId);
      if (kandidaatId) params.set("kandidaat_id", kandidaatId);

      const res = await fetch(`/api/activiteiten?${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = (data.activiteiten || []) as EmailLog[];
        setHasMore(items.length > PAGE_SIZE);
        setEmails(items.slice(0, PAGE_SIZE));
      }
    } finally {
      setLoading(false);
    }
  }, [klantId, kandidaatId]);

  useEffect(() => {
    fetchEmails(0);
    setOffset(0);
  }, [fetchEmails]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <p className="text-sm text-muted">Laden...</p>;
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-heading">Nog geen emails gelogd</p>
        <p className="text-xs text-muted mt-1">
          Emails verschijnen hier zodra je ze vanuit kSuite verstuurt of ontvangt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => {
        const meta = email.metadata;
        const subject = meta?.subject || email.beschrijving.replace(/^Email( verzonden| ontvangen)?: /, "");
        const to = meta?.to || "";
        const from = meta?.from || "";
        const date = meta?.date || email.created_at;
        const direction = meta?.direction ?? "sent";
        const isSent = direction === "sent";

        return (
          <Card key={email.id} padding="sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-heading truncate">{subject}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isSent
                      ? "bg-purple-400/15 text-purple-400"
                      : "bg-smaragd/15 text-smaragd"
                  }`}>
                    {isSent ? "Verzonden" : "Ontvangen"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {from && (
                    <span className="text-xs text-muted">
                      Van: <span className="text-body">{from}</span>
                    </span>
                  )}
                  {to && (
                    <span className="text-xs text-muted">
                      Aan: <span className="text-body">{to}</span>
                    </span>
                  )}
                </div>
                {email.user?.full_name && (
                  <p className="text-xs text-muted mt-1">
                    {isSent ? "Verstuurd door" : "Ontvangen door"} {email.user.full_name}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted whitespace-nowrap shrink-0">
                {formatDate(date)}
              </span>
            </div>
          </Card>
        );
      })}

      {hasMore && (
        <button
          className="w-full text-xs text-muted hover:text-body py-2 transition-colors"
          onClick={() => {
            const newOffset = offset + PAGE_SIZE;
            setOffset(newOffset);
            fetchEmails(newOffset);
          }}
        >
          Meer laden
        </button>
      )}
    </div>
  );
}
