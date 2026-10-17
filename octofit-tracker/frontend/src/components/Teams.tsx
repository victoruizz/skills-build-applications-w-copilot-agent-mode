import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamItem = {
  name?: string;
  mascot?: string;
  members?: Array<string | { toString(): string }>;
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<{ teams?: TeamItem[] }>('/api/teams')
      .then((data) => {
        if (cancelled) return;
        setTeams(data.teams ?? []);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load teams.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const status = error ? <p role="alert">{error}</p> : <p role="status">{loading ? 'Loading teams...' : 'Loaded teams.'}</p>;

  return (
    <CapabilityCard title="Teams" description="Manage teams and members." status={status}>
      {loading ? null : teams.length === 0 ? <p>No teams</p> : (
        <ul>
          {teams.map((team, index) => (
            <li key={`${team.name ?? 'team'}-${index}`}>
              <strong>{team.name ?? 'Team'}</strong>
              {team.mascot ? ` · ${team.mascot}` : ''}
              {team.members && team.members.length > 0 ? ` · ${team.members.map((member) => String(member)).join(', ')}` : ''}
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
