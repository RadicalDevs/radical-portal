import AdminSidebar from "@/components/layout/AdminSidebar";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userName = "";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const db = createServiceClient();
      const { data } = await db
        .from("portal_users")
        .select("first_name, last_name")
        .eq("auth_user_id", user.id)
        .single();
      if (data) {
        userName = [data.first_name, data.last_name].filter(Boolean).join(" ");
      }
    }
  } catch { /* non-blocking */ }

  return (
    <div className="flex flex-1">
      <AdminSidebar userName={userName} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
