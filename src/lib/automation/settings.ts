import { createServiceClient } from "@/lib/supabase/server";

export interface AutomationSetting {
  key: string;
  enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
}

export async function isAutomationEnabled(key: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("automation_settings")
    .select("enabled")
    .eq("key", key)
    .single();
  return data?.enabled === true;
}

export async function getAutomationConfig(key: string): Promise<AutomationSetting | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("automation_settings")
    .select("*")
    .eq("key", key)
    .single();
  return data as AutomationSetting | null;
}
