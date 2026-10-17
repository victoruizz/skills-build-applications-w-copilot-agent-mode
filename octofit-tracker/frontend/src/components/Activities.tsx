import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityItem = {
  type?: string;
  minutes?: number;
  points?: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<{ activities?: ActivityItem[] }>('/api/activities')
      .then((data) => {
        if (cancelled) return;
        setActivities(data.activities ?? []);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load activities.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const status = error ? <p role="alert">{error}</p> : <p role="status">{loading ? 'Loading activities...' : 'Loaded activities.'}</p>;

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points." status={status}>
      {loading ? null : activities.length === 0 ? <p>No activities</p> : (
        <ul>
          {activities.map((activity, index) => (
            <li key={`${activity.type ?? 'activity'}-${index}`}>
              {activity.type ?? 'Activity'} · {activity.minutes ?? 0} min · {activity.points ?? 0} pts
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
