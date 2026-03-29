import useSWR from "swr";

export function useUnreadCount() {
  const { data, error, isLoading } = useSWR<{ unreadCount: number }>(
    "/api/google/messages/unread-count",
    { refreshInterval: 60_000 },
  );

  return {
    unreadCount: data?.unreadCount ?? 0,
    error,
    isLoading,
  };
}
