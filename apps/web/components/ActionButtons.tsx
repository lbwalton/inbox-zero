import { useCallback, useMemo, useState } from "react";
import {
  ArchiveIcon,
  Trash2Icon,
  ExternalLinkIcon,
  SparklesIcon,
} from "lucide-react";
import { ButtonGroup } from "@/components/ButtonGroup";
import { HelpTooltipContent } from "@/components/HelpTooltipContent";
import { LoadingMiniSpinner } from "@/components/Loading";
import { getGmailUrl } from "@/utils/url";
import { onTrashThread } from "@/utils/actions/client";
import { useAccount } from "@/providers/EmailAccountProvider";
import { useHelpfulTips } from "@/hooks/useHelpfulTips";

export function ActionButtons({
  threadId,
  onArchive,
  onPlanAiAction,
  isPlanning,
  refetch,
  shadow,
}: {
  threadId: string;
  isPlanning: boolean;
  shadow?: boolean;
  onPlanAiAction: () => void;
  onArchive: () => void;
  refetch: (threadId?: string) => void;
}) {
  const { emailAccountId, userEmail } = useAccount();

  const openInGmail = useCallback(() => {
    // open in gmail
    const url = getGmailUrl(threadId, userEmail);
    window.open(url, "_blank");
  }, [threadId, userEmail]);

  const [isTrashing, setIsTrashing] = useState(false);

  // TODO lift this up to the parent component to be consistent / to support bulk trash
  // TODO show loading toast
  const onTrash = useCallback(async () => {
    setIsTrashing(true);
    await onTrashThread({ emailAccountId, threadId });
    refetch(threadId);
    setIsTrashing(false);
  }, [threadId, refetch, emailAccountId]);

  const showTips = useHelpfulTips();

  const buttons = useMemo(
    () => [
      {
        tooltip: "Open in Gmail",
        contentComponent: showTips ? (
          <HelpTooltipContent
            title="Open in Gmail"
            description="Opens this email thread in Gmail in a new tab so you can use Gmail's full interface."
          />
        ) : undefined,
        onClick: openInGmail,
        icon: <ExternalLinkIcon className="size-4" aria-hidden="true" />,
      },
      {
        tooltip: "Process with assistant",
        contentComponent: showTips ? (
          <HelpTooltipContent
            title="AI Assist"
            description="Runs your automation rules on this email. The assistant decides what to do based on the rules you've set up."
            example="If you have a rule to label emails from your boss as 'Priority', clicking this applies that label."
          />
        ) : undefined,
        onClick: onPlanAiAction,
        icon: isPlanning ? (
          <LoadingMiniSpinner />
        ) : (
          <SparklesIcon className="size-4" aria-hidden="true" />
        ),
      },
      {
        tooltip: "Archive",
        contentComponent: showTips ? (
          <HelpTooltipContent
            title="Archive"
            description="Moves this email out of your inbox without deleting it. You can find it in Gmail's Archive."
            example="Archive a newsletter you've read but want to keep for reference."
          />
        ) : undefined,
        onClick: onArchive,
        icon: <ArchiveIcon className="size-4" aria-hidden="true" />,
      },
      // may remove later
      {
        tooltip: "Delete",
        contentComponent: showTips ? (
          <HelpTooltipContent
            title="Delete"
            description="Permanently deletes this email. This cannot be undone."
            example="Delete a spam email you never want to see again."
          />
        ) : undefined,
        onClick: onTrash,
        icon: isTrashing ? (
          <LoadingMiniSpinner />
        ) : (
          <Trash2Icon className="size-4" aria-hidden="true" />
        ),
      },
    ],
    [
      showTips,
      onTrash,
      isTrashing,
      onArchive,
      onPlanAiAction,
      isPlanning,
      openInGmail,
    ],
  );

  return <ButtonGroup buttons={buttons} shadow={shadow} />;
}
