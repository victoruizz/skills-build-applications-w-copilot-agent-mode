import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title?: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const userEmail = encodeURIComponent('mona@example.com');

    getJson<{ suggestions?: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${userEmail}`)
      .then((data) => {
        if (cancelled) return;
        setSuggestions(data.suggestions ?? []);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load workout suggestions.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const status = error ? <p role="alert">{error}</p> : <p role="status">{loading ? 'Loading workout suggestions...' : 'Loaded workout suggestions.'}</p>;

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." status={status}>
      {loading ? null : suggestions.length === 0 ? <p>No workout suggestions</p> : (
        <ul>
          {suggestions.map((workout, index) => (
            <li key={`${workout.title ?? 'workout'}-${index}`}>
              <strong>{workout.title ?? 'Workout'}</strong>
              {workout.focus ? ` · ${workout.focus}` : ''}
              {workout.minutes ? ` · ${workout.minutes} min` : ''}
              {workout.reason ? ` · ${workout.reason}` : ''}
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
