"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActiviteitType } from "@/lib/types/crm";
import type { ActiviteitWithUser } from "@/app/admin/actions/activiteiten";
import { getActiviteiten, createActiviteit, updateActiviteit, deleteActiviteit } from "@/app/admin/actions/activiteiten";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";

interface ActivityTimelineProps {
  entityType: "kandidaat" | "klant" | "vacature";
  entityId: string;
}

const PAGE_SIZE = 20;

const TYPE_CONFIG: Record<ActiviteitType, { label: string; icon: string; color: string }> = {
  notitie: { label: "Notitie", icon: "📝", color: "bg-blue-400" },
  gespreksverslag: { label: "Gespreksverslag", icon: "📋", color: "bg-teal-400" },
  screening: { label: "Screening", icon: "🔍", color: "bg-orange-400" },
  voorstel: { label: "Voorstel", icon: "📤", color: "bg-indigo-400" },
  email: { label: "Email", icon: "✉️", color: "bg-purple-400" },
  whatsapp: { label: "WhatsApp", icon: "💬", color: "bg-green-400" },
  telefoon: { label: "Telefoon", icon: "📞", color: "bg-yellow-400" },
  afspraak: { label: "Afspraak", icon: "📅", color: "bg-coral" },
  statuswijziging: { label: "Status", icon: "🔄", color: "bg-smaragd" },
  systeem: { label: "Systeem", icon: "⚙️", color: "bg-gray-400" },
  apac: { label: "APAC", icon: "📊", color: "bg-smaragd" },
};

const CREATABLE_TYPES: ActiviteitType[] = [
  "notitie", "gespreksverslag", "telefoon", "email", "whatsapp", "screening", "voorstel", "afspraak",
];

const MULTILINE_TYPES: ActiviteitType[] = ["gespreksverslag", "screening"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Zojuist";
  if (mins < 60) return `${mins} min geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dag${days > 1 ? "en" : ""} geleden`;
  return new Date(dateStr).toLocaleDateString("nl-NL");
}

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActiviteitWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ActiviteitType | null>(null);
  const [newNote, setNewNote] = useState("");
  const [selectedType, setSelectedType] = useState<ActiviteitType>("notitie");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [detailActivity, setDetailActivity] = useState<ActiviteitWithUser | null>(null);

  const fkField = entityType === "kandidaat" ? "kandidaat_id" : entityType === "klant" ? "klant_id" : "vacature_id";

  const fetchActivities = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true);
    try {
      const items = await getActiviteiten({
        [fkField]: entityId,
        limit: PAGE_SIZE,
        offset,
        ...(typeFilter ? { type: typeFilter } : {}),
      });
      setActivities((prev) => (append ? [...prev, ...items] : items));
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      console.error("[ActivityTimeline] fetchActivities failed:", err);
    } finally {
      setLoading(false);
    }
  }, [fkField, entityId, typeFilter]);

  useEffect(() => {
    fetchActivities(0, false);
  }, [fetchActivities]);

  const handleAddActivity = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await createActiviteit({
        type: selectedType,
        beschrijving: newNote.trim(),
        [fkField]: entityId,
      });
      setNewNote("");
      fetchActivities(0, false);
    } catch (err) {
      console.error("[ActivityTimeline] createActiviteit failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditStart = (a: ActiviteitWithUser) => {
    setEditingId(a.id);
    setEditText(a.beschrijving);
  };

  const handleEditSave = async (id: string) => {
    if (!editText.trim()) return;
    try {
      await updateActiviteit(id, editText.trim());
      setEditingId(null);
      fetchActivities(0, false);
    } catch (err) {
      console.error("[ActivityTimeline] updateActiviteit failed:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Activiteit verwijderen?")) return;
    try {
      await deleteActiviteit(id);
      fetchActivities(0, false);
    } catch (err) {
      console.error("[ActivityTimeline] deleteActiviteit failed:", err);
    }
  };

  const isMultiline = MULTILINE_TYPES.includes(selectedType);

  return (
    <div className="space-y-4">
      {/* Type selector pills */}
      <div className="flex flex-wrap gap-1">
        {CREATABLE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            title={TYPE_CONFIG[type].label}
            className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-all ${
              selectedType === type
                ? "border-smaragd bg-smaragd/10 text-smaragd"
                : "border-surface-border bg-transparent text-muted hover:text-heading"
            }`}
          >
            <span className="mr-0.5">{TYPE_CONFIG[type].icon}</span>
            {TYPE_CONFIG[type].label}
          </button>
        ))}
      </div>

      {/* Input + submit */}
      <div className="flex gap-2 items-end">
        {isMultiline ? (
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleAddActivity()}
            placeholder={`${TYPE_CONFIG[selectedType].label} toevoegen...`}
            rows={4}
            className="flex-1 rounded-lg border border-surface-border bg-surface-light px-3 py-2 text-sm text-heading placeholder:text-muted outline-none focus:border-smaragd/50 resize-none"
          />
        ) : (
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddActivity()}
            placeholder={`${TYPE_CONFIG[selectedType].label} toevoegen...`}
            className="flex-1 rounded-lg border border-surface-border bg-surface-light px-3 py-2 text-sm text-heading placeholder:text-muted outline-none focus:border-smaragd/50"
          />
        )}
        <Button onClick={handleAddActivity} loading={saving} variant="secondary" className="text-sm shrink-0">
          {isMultiline ? "Opslaan" : "+"}
        </Button>
      </div>

      {/* Type filter — compact select */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted shrink-0">Filter</span>
        <select
          value={typeFilter ?? ""}
          onChange={(e) => setTypeFilter((e.target.value as ActiviteitType) || null)}
          className="flex-1 rounded-lg border border-surface-border bg-surface-light px-2.5 py-1.5 text-xs text-heading outline-none focus:border-smaragd/50 cursor-pointer"
        >
          <option value="">Alle activiteiten</option>
          {(Object.keys(TYPE_CONFIG) as ActiviteitType[]).map((type) => (
            <option key={type} value={type}>{TYPE_CONFIG[type].icon} {TYPE_CONFIG[type].label}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-light" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nog geen activiteiten.</p>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-surface-border" />
          <div className="space-y-1">
            {activities.map((a) => {
              const config = TYPE_CONFIG[a.type] || TYPE_CONFIG.notitie;
              return (
                <div
                  key={a.id}
                  className="group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-light"
                >
                  <div
                    className={`absolute -left-4 top-4 h-2.5 w-2.5 rounded-full border-2 border-surface ${config.color}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={a.type === "statuswijziging" ? "smaragd" : "default"}>
                        {config.icon} {config.label}
                      </Badge>
                      <span className="text-xs text-muted">{timeAgo(a.created_at)}</span>
                      {a.user && (
                        <span className="text-xs text-muted">
                          — {(a.user as { full_name: string }).full_name}
                        </span>
                      )}
                    </div>
                    {editingId === a.id ? (
                      <div className="mt-1 flex gap-2 items-end">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleEditSave(a.id); if (e.key === "Escape") setEditingId(null); }}
                          rows={3}
                          className="flex-1 rounded-lg border border-smaragd/50 bg-surface-light px-3 py-2 text-sm text-heading outline-none resize-none"
                          autoFocus
                        />
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => handleEditSave(a.id)} className="rounded-lg bg-smaragd/20 border border-smaragd/40 px-2 py-1 text-xs text-smaragd hover:bg-smaragd/30 transition-colors">
                            Opslaan
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-surface-border px-2 py-1 text-xs text-muted hover:text-heading transition-colors">
                            Annuleer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setDetailActivity(a)} className="mt-1 cursor-pointer hover:text-smaragd transition-colors">
                        <p className="text-sm text-heading leading-relaxed line-clamp-3" title="Klik om volledig te lezen">
                          {a.beschrijving}
                        </p>
                        {a.type === "email" && a.metadata && (() => {
                          const m = a.metadata as Record<string, string>;
                          const dir = m.direction ?? "sent";
                          return (
                            <div className="mt-1.5 text-xs text-muted space-y-0.5">
                              {dir === "received" && (
                                <p className="text-smaragd font-medium">↙ Ontvangen</p>
                              )}
                              {m.from && (
                                <p>Van: <span className="text-body">{m.from}</span></p>
                              )}
                              {m.to && (
                                <p>Aan: <span className="text-body">{m.to}</span></p>
                              )}
                              {m.body && (
                                <p className="mt-1 text-body line-clamp-2">{m.body}</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  {a.type !== "statuswijziging" && a.type !== "systeem" && editingId !== a.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                      <button
                        onClick={() => handleEditStart(a)}
                        title="Bewerken"
                        className="rounded p-1 text-muted hover:text-heading hover:bg-surface transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        title="Verwijderen"
                        className="rounded p-1 text-muted hover:text-red-400 hover:bg-surface transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => fetchActivities(activities.length, true)}
                className="text-sm"
              >
                Meer laden...
              </Button>
            </div>
          )}
        </div>
      )}
      {detailActivity && (
        <ActivityDetailModal
          activity={detailActivity}
          onClose={() => setDetailActivity(null)}
        />
      )}
    </div>
  );
}

function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: ActiviteitWithUser;
  onClose: () => void;
}) {
  const cfg = TYPE_CONFIG[activity.type] || TYPE_CONFIG.notitie;
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl border border-surface-border bg-surface shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{cfg.icon}</span>
            <span className="font-semibold text-heading">{cfg.label}</span>
            <span className="text-xs text-muted">{timeAgo(activity.created_at)}</span>
            {activity.user && (
              <span className="text-xs text-muted">— {(activity.user as { full_name: string }).full_name}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-heading hover:bg-surface-light transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3">
          {activity.type === "email" && activity.metadata && (() => {
            const m = activity.metadata as Record<string, string>;
            const dir = m.direction ?? "sent";
            return (
              <div className="text-xs text-muted space-y-1 pb-3 border-b border-surface-border">
                {dir === "received" && (
                  <p className="text-smaragd font-medium mb-1">↙ Ontvangen email</p>
                )}
                {m.from && <p><span className="font-medium">Van:</span> {m.from}</p>}
                {m.to && <p><span className="font-medium">Aan:</span> {m.to}</p>}
                {m.date && <p><span className="font-medium">Datum:</span> {new Date(m.date).toLocaleString("nl-NL")}</p>}
                {m.subject && <p><span className="font-medium">Onderwerp:</span> {m.subject}</p>}
              </div>
            );
          })()}
          <p className="text-sm text-heading leading-relaxed whitespace-pre-wrap">
            {activity.type === "email" && (activity.metadata as Record<string, string>)?.body
              ? (activity.metadata as Record<string, string>).body
              : activity.beschrijving}
          </p>
        </div>
      </div>
    </div>
  );
}
