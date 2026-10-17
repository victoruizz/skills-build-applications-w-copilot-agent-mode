import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function notFound(message: string) {
  return Object.assign(new Error(message), { status: 404 });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Activity payload is required');
  }

  const payload = input as Record<string, unknown>;
  const { userId, teamId, type, minutes } = payload;

  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    throw badRequest('A valid userId is required');
  }

  if (!teamId || typeof teamId !== 'string' || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw badRequest('A valid teamId is required');
  }

  if (typeof type !== 'string' || type.trim() === '') {
    throw badRequest('Activity type is required');
  }

  if (typeof minutes !== 'number' || Number.isNaN(minutes) || minutes <= 0) {
    throw badRequest('Activity minutes must be a positive number');
  }

  const userExists = await User.exists({ _id: userId });
  const teamExists = await Team.exists({ _id: teamId });

  if (!userExists || !teamExists) {
    throw badRequest('Activity references must match an existing user and team');
  }

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: Math.max(1, Math.round(minutes)),
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Team payload is required');
  }

  const payload = input as Record<string, unknown>;
  const { name, mascot, members } = payload;

  if (typeof name !== 'string' || name.trim() === '') {
    throw badRequest('Team name is required');
  }

  if (typeof mascot !== 'string' || mascot.trim() === '') {
    throw badRequest('Team mascot is required');
  }

  const memberIds = Array.isArray(members)
    ? members.map((member) => String(member)).filter((member) => mongoose.Types.ObjectId.isValid(member))
    : [];

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberIds,
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  const leaderboard = await Promise.all(
    totals.map(async (entry, index) => {
      const team = await Team.findById(entry._id).lean();
      return {
        teamName: team?.name ?? 'Unknown team',
        totalPoints: entry.totalPoints,
        rank: index + 1,
      };
    }),
  );

  return leaderboard;
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw notFound('User not found');
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).lean();
  const recentType = recentActivities[0]?.type ?? user.fitnessGoal ?? 'endurance';
  const preferredFocuses = [user.fitnessGoal, recentType].filter(Boolean);

  const workouts = await Workout.find().lean();
  const scored = workouts
    .map((workout) => {
      const score = preferredFocuses.includes(workout.focus) ? 2 : 0;
      const reason = preferredFocuses.includes(workout.focus)
        ? `Matches your ${user.fitnessGoal} goal and recent ${recentType} activity.`
        : `Additional option for training variety.`;
      return { workout, score, reason };
    })
    .sort((a, b) => b.score - a.score || a.workout.title.localeCompare(b.workout.title));

  const suggestions = scored.map(({ workout, reason }) => ({
    ...workout,
    reason,
  }));

  return suggestions;
}

export { User };
