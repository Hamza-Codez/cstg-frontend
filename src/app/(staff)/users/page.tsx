import { redirect } from "next/navigation";

import { ActiveToggle, StaffForm } from "@/components/forms/staff-form";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/ui/table";
import { listStaff } from "@/lib/api/admin";
import { getSession } from "@/lib/auth/session";
import { roleLabel } from "@/lib/labels";

export const metadata = { title: "Users · Support Engine" };

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await listStaff(session.token);
  if (!result.ok) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-overdue">
            {result.error.code === "FORBIDDEN"
              ? "You don't have access to this."
              : "Something went wrong on our end. Try again."}
          </p>
        </CardBody>
      </Card>
    );
  }

  const staff = result.data.items;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Users</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add a staff member</CardTitle>
        </CardHeader>
        <CardBody>
          <StaffForm />
        </CardBody>
      </Card>

      <Table caption="Staff">
        <TableHead>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Role</Th>
          <Th>Status</Th>
          <Th>Action</Th>
        </TableHead>
        <TableBody>
          {staff.map((member) => (
            <Tr key={member.id}>
              <Td>{member.name}</Td>
              <Td>{member.email}</Td>
              <Td>{roleLabel(member.role)}</Td>
              <Td className={member.is_active ? "text-on-track" : "text-text/50"}>
                {member.is_active ? "Active" : "Deactivated"}
              </Td>
              <Td>
                <ActiveToggle
                  userId={member.id}
                  isActive={member.is_active}
                  isSelf={member.id === session.principalId}
                />
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-text/60">
        Deactivating keeps a person&apos;s history intact — they simply stop appearing as an
        assignee for new work.
      </p>
    </div>
  );
}
