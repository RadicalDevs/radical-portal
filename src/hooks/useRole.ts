"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types/crm";

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("portal_users")
        .select("role")
        .eq("auth_user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setRole(data.role as UserRole);
        });
    });
  }, []);

  return {
    role,
    canWrite: role === "admin",
    isAdmin: role === "admin",
  };
}
