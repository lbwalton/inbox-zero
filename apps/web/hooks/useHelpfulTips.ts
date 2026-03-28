import { useUser } from "@/hooks/useUser";

export function useHelpfulTips(): boolean {
  const { data } = useUser();
  return data?.showHelpfulTips ?? true;
}
