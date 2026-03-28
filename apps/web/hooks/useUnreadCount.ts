import useSWR from "swr";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch unread count");
  return res.json();
}

export function useUnreadCount() {
  const { data, error, isLoading } = useSWR<{ unreadCount: number }>(
    "/api/google/messages/unread-count",
    fetcher,
    { refreshInterval: 60_000 },
  );

  return {
    unreadCount: data?.unreadCount ?? 0,
    error,
    isLoading,
  };
}
