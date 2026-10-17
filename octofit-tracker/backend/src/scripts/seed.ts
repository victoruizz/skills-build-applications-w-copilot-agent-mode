import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Activity, Team, User, Workout } from '../models/index.js';

const teamFixtures = {
  octocats: { name: 'Octocats', mascot: 'Mona' },
  robocats: { name: 'Robocats', mascot: 'Hubot' },
};

const userFixtures = {
  mona: { name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance' },
  hubot: { name: 'Hubot', email: 'hubot@example.com', fitnessGoal: 'strength' },
};

async function upsertDemoUser(name: string, email: string, teamId: InstanceType<typeof Team>['_id'], fitnessGoal: string) {
  const previousUser = await User.findOne({ email }).select('_id team');
  if (previousUser?.team && previousUser.team.toString() !== teamId.toString()) {
    await Team.updateOne({ _id: previousUser.team }, { $pull: { members: previousUser._id } });
  }

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name, email, team: teamId, fitnessGoal } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await Team.updateOne({ _id: teamId }, { $addToSet: { members: user._id } });
  return user;
}

export async function seed() {
  await connectDatabase();
  try {
    const octocats = await Team.findOneAndUpdate(
      { name: teamFixtures.octocats.name },
      { $set: { name: teamFixtures.octocats.name, mascot: teamFixtures.octocats.mascot } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const robocats = await Team.findOneAndUpdate(
      { name: teamFixtures.robocats.name },
      { $set: { name: teamFixtures.robocats.name, mascot: teamFixtures.robocats.mascot } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const mona = await upsertDemoUser(userFixtures.mona.name, userFixtures.mona.email, octocats._id, userFixtures.mona.fitnessGoal);
    const hubot = await upsertDemoUser(userFixtures.hubot.name, userFixtures.hubot.email, robocats._id, userFixtures.hubot.fitnessGoal);

    const monaRunAt = new Date('2026-01-10T12:00:00.000Z');
    const hubotCycleAt = new Date('2026-01-11T12:00:00.000Z');

    await Activity.updateOne(
      { user: mona._id, team: octocats._id, type: 'run', occurredAt: monaRunAt },
      { $set: { user: mona._id, team: octocats._id, type: 'run', minutes: 40, points: 40, occurredAt: monaRunAt } },
      { upsert: true },
    );
    await Activity.updateOne(
      { user: hubot._id, team: robocats._id, type: 'cycle', occurredAt: hubotCycleAt },
      { $set: { user: hubot._id, team: robocats._id, type: 'cycle', minutes: 25, points: 25, occurredAt: hubotCycleAt } },
      { upsert: true },
    );

    await Workout.updateOne(
      { title: 'Intervals' },
      { $set: { title: 'Intervals', focus: 'endurance', minutes: 30, difficulty: 'moderate' } },
      { upsert: true },
    );
    await Workout.updateOne(
      { title: 'Strength Circuit' },
      { $set: { title: 'Strength Circuit', focus: 'strength', minutes: 30, difficulty: 'moderate' } },
      { upsert: true },
    );
  } finally {
    await disconnectDatabase();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  await seed();
}
