import { useEffect, useState, useCallback } from "react";
import { ActivityEvent } from "@/lib/types/activity";

const API_BASE = "http://localhost:8000";

export function useActivities(walletAddress?: string) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/activities/${walletAddress}?page=1&page_size=50`);
      if (!res.ok) return;
      const data = await res.json();
      setActivities(data.data || []);
    } catch (err) {
      console.warn("[USE_ACTIVITIES] Sync deferred.", err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 15000); // Background sync every 15s
    return () => clearInterval(interval);
  }, [fetchActivities]);

  return { activities, isLoading, refetch: fetchActivities };
}
