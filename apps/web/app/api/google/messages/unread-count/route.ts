import { NextResponse } from "next/server";
import { withEmailAccount } from "@/utils/middleware";
import { getGmailAndAccessTokenForEmail } from "@/utils/account";

export const dynamic = "force-dynamic";

export const GET = withEmailAccount(async (request) => {
  const emailAccountId = request.auth.emailAccountId;

  const { gmail } = await getGmailAndAccessTokenForEmail({ emailAccountId });

  const label = await gmail.users.labels.get({
    userId: "me",
    id: "INBOX",
  });

  const unreadCount = label.data.messagesUnread ?? 0;

  return NextResponse.json({ unreadCount });
});
