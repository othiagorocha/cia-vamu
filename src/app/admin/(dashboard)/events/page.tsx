import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const AdminEventsRedirectPage = () => {
  redirect("/admin/agenda");
};

export default AdminEventsRedirectPage;
