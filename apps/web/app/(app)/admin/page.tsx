import { AdminUpgradeUserForm } from "@/app/(app)/admin/AdminUpgradeUserForm";
import { AdminUserControls } from "@/app/(app)/admin/AdminUserControls";
import { AdminUserTable } from "@/app/(app)/admin/AdminUserTable";
import { AdminAuditLog } from "@/app/(app)/admin/AdminAuditLog";
import { TopSection } from "@/components/TopSection";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import { ErrorPage } from "@/components/ErrorPage";
import { isAdmin } from "@/utils/admin";
import { AdminSyncStripe } from "@/app/(app)/admin/AdminSyncStripe";
import prisma from "@/utils/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

      <div className="m-8">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="tools">Admin Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-6 space-y-8">
            <AdminUserTable />
          </TabsContent>
          <TabsContent value="audit" className="mt-6">
            <AdminAuditLog />
          </TabsContent>
          <TabsContent value="tools" className="mt-6 space-y-8">
            <AdminUpgradeUserForm />
            <AdminUserControls />
            <AdminSyncStripe />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
