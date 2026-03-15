/**
 * Seed script for sample posts
 *
 * Creates sample posts for the users created in 01-users.ts
 */

export default async (db: any) => {
  console.log("Seeding sample posts...");

  // Get the first user's ID
  const users = await db.all({
    sql: "SELECT id FROM users LIMIT 1",
    args: [],
  });

  if (users.length === 0) {
    console.log("⚠️  No users found, skipping posts seed");
    return;
  }

  const userId = users[0].id;

  // Insert sample posts
  await db.run({
    sql: `
      INSERT OR IGNORE INTO posts (user_id, title, content, published)
      VALUES 
        (?, 'Welcome to Buntime', 'This is a sample post to demonstrate migrations and seeds.', 1),
        (?, 'Getting Started', 'Learn how to use the migrations plugin.', 1),
        (?, 'Draft Post', 'This post is not published yet.', 0)
    `,
    args: [userId, userId, userId],
  });

  console.log("✅ Posts seeded successfully");
};
