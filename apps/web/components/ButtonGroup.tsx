import { Tooltip } from "@/components/Tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

export function ButtonGroup(props: {
  buttons: {
    text?: string;
    icon?: React.ReactNode;
    tooltip?: string;
    contentComponent?: React.ReactNode;
    onClick: () => void;
  }[];
  shadow?: boolean;
}) {
  return (
    <span
      className={cn("isolate inline-flex rounded-md bg-background", {
        shadow: props.shadow,
      })}
    >
      {props.buttons.map((button) => (
        <Tooltip
          key={button.text || button.tooltip}
          content={button.tooltip}
          contentComponent={button.contentComponent}
        >
          <Button onClick={button.onClick} size="icon" variant="ghost">
            {button.icon}
            {button.text}
          </Button>
        </Tooltip>
      ))}
    </span>
  );
}
