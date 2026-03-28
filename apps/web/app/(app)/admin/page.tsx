import { AdminUpgradeUserForm } from "@/app/(app)/admin/AdminUpgradeUserForm";
import { AdminUserControls } from "@/app/(app)/admin/AdminUserControls";
import { AdminUserTable } from "@/app/(app)/admin/AdminUserTable";
import { TopSection } from "@/components/TopSection";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import { ErrorPage } from "@/components/ErrorPage";
import { isAdmin } from "@/utils/admin";
import { AdminSyncStripe } from "@/app/(app)/admin/AdminSyncStripe";
import prisma from "@/utils/prisma";

// NOTE: Turn on Fluid Compute on Vercel to allow for 800 seconds max duration
export const maxDuration = 800;

export default async function AdminPage() {
  const session = await auth();

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
    : null;

  if (!isAdmin({ email: session?.user.email, role: user?.role })) {
    return (
      <ErrorPage
        title="No Access"
        description="You do not have permission to access this page."
      />
    );
  }

  return (
    <div>
      <TopSection title="Admin" />

      <div className="m-8 space-y-8">
        <div>
          <h2 className="mb-4 text-lg font-semibold">User Management</h2>
          <AdminUserTable />
        </div>
        <AdminUpgradeUserForm />
        <AdminUserControls />
        <AdminSyncStripe />
      </div>
    </div>
  );
}
