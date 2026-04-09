import { getTemplates, getUsers, getCurrentUserInfo } from "@/app/admin/actions/settings";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const [templates, users, userInfo] = await Promise.all([
    getTemplates(),
    getUsers(),
    getCurrentUserInfo(),
  ]);

  return <SettingsClient templates={templates} users={users} userRole={userInfo?.role ?? null} userEmail={userInfo?.email ?? null} />;
}
