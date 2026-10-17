import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardItem = {
  teamName?: string;
  totalPoints?: number;
  rank?: number;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<{ leaderboard?: LeaderboardItem[] }>('/api/leaderboard')
      .then((data) => {
        if (cancelled) return;
        setLeaderboard(data.leaderboard ?? []);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load leaderboard.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const status = error ? <p role="alert">{error}</p> : <p role="status">{loading ? 'Loading leaderboard...' : 'Loaded leaderboard.'}</p>;

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals." status={status}>
      {loading ? null : leaderboard.length === 0 ? <p>No leaderboard</p> : (
        <ol>
          {leaderboard.map((entry, index) => (
            <li key={`${entry.teamName ?? 'team'}-${index}`}>
              {entry.teamName ?? 'Team'} — {entry.totalPoints ?? 0} points (Rank {entry.rank ?? index + 1})
            </li>
          ))}
        </ol>
      )}
    </CapabilityCard>
  );
}
