import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onPipelineStageChange } from "@/lib/automation/pipelineNotifier";

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { kandidaatId, vacatureId, klantId, oldStage, newStage } = body as {
    kandidaatId: string;
    vacatureId?: string;
    klantId?: string;
    oldStage?: string;
    newStage: string;
  };

  if (!newStage) {
    return NextResponse.json({ error: "newStage is required" }, { status: 400 });
  }

  try {
    await onPipelineStageChange({
      kandidaatId,
      vacatureId,
      klantId,
      oldStage: oldStage || "",
      newStage,
    });
  } catch (error) {
    console.error("[Pipeline Notify Error]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
