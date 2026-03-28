import { useMemo } from "react";
import { ButtonGroup } from "@/components/ButtonGroup";
import { HelpTooltipContent } from "@/components/HelpTooltipContent";
import { LoadingMiniSpinner } from "@/components/Loading";
import { useHelpfulTips } from "@/hooks/useHelpfulTips";
import {
  ArchiveIcon,
  CheckCircleIcon,
  SparklesIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";

export function ActionButtonsBulk(props: {
  isPlanning: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  onPlanAiAction: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const {
    isPlanning,
    isArchiving,
    isDeleting,
    isApproving,
    isRejecting,
    onArchive,
    onPlanAiAction,
    onDelete,
    onApprove,
    onReject,
  } = props;

  const showTips = useHelpfulTips();

  const buttons = useMemo(
    () => [
      {
        tooltip: "Process with assistant",
        contentComponent: showTips ? (
          <HelpTooltipContent
            title="AI Assist"
            description="Runs your automation rules on the selected emails. The assistant decides what to do based on the rules you've set up."
            example="If you have a rule to archive newsletters, clicking this will archive all selected newsletter emails."
          />
        ) : undefined,
        onClick: onPlanAiAction,
        icon: isPlanning ? (
          <LoadingMiniSpinner />
        ) : (
          <SparklesIcon className="size-4 text-foreground" aria-hidden="true" />
        ),
      },
      {
        tooltip: "Approve AI Action",
        contentComponent: showTips ? (
          <HelpTooltipContent
            title="Approve AI Action"
            description="Executes the action the AI has already planned for these emails. The AI suggests; you approve."
            example="If the AI planned to label an email as 'Client', clicking Approve applies that label now."
          />
        ) : undefined,
        onClick: onApprove,
        icon: isApproving ? (
          <LoadingMiniSpinner />
        ) : (
          <CheckCircleIcon
            className="size-4 text-foreground"
            aria-hidden="true"
          />
        ),
      },
      {
        tooltip: "Reject AI Action",
        contentComponent: showTips ? (
          <HelpTooltipContent
            title="Reject AI Action"
            description="Cancels the AI's planned action without applying it. The email stays as-is."
            example="If the AI planned to archive an email you want to keep, click Reject to dismiss that suggestion."
          />
        ) : undefined,
        onClick: onReject,
        icon: isRejecting ? (
          <LoadingMiniSpinner />
        ) : (
          <XCircleIcon className="size-4 text-foreground" aria-hidden="true" />
        ),
      },
      {
        tooltip: "Archive",
        contentComponent: showTips ? (
          <HelpTooltipContent
            title="Archive"
            description="Moves selected emails out of your inbox without deleting them. You can find them in Gmail's Archive."
            example="Select 5 old newsletters and click Archive to clear them from your inbox."
          />
        ) : undefined,
        onClick: onArchive,
        icon: isArchiving ? (
          <LoadingMiniSpinner />
        ) : (
          <ArchiveIcon className="size-4 text-foreground" aria-hidden="true" />
        ),
      },
      {
        tooltip: "Delete",
        contentComponent: showTips ? (
          <HelpTooltipContent
            title="Delete"
            description="Permanently deletes the selected emails. This cannot be undone."
            example="Select spam emails and click Delete to remove them forever."
          />
        ) : undefined,
        onClick: onDelete,
        icon: isDeleting ? (
          <LoadingMiniSpinner />
        ) : (
          <Trash2Icon className="size-4 text-foreground" aria-hidden="true" />
        ),
      },
    ],
    [
      showTips,
      isArchiving,
      isPlanning,
      isDeleting,
      isApproving,
      isRejecting,
      onArchive,
      onPlanAiAction,
      onDelete,
      onApprove,
      onReject,
    ],
  );

  return <ButtonGroup buttons={buttons} />;
}
