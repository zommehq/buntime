/**
 * Seed script for initial users
 *
 * This file demonstrates how to create seed data for your database.
 * The function receives the database instance and can use it to insert data.
 */

export default async (db: any) => {
  console.log("Seeding initial users...");

  // Example using raw SQL
  await db.run({
    sql: `
      INSERT OR IGNORE INTO users (name, email)
      VALUES 
        ('Admin User', 'admin@example.com'),
        ('Test User', 'test@example.com'),
        ('Demo User', 'demo@example.com')
    `,
    args: [],
  });

  console.log("✅ Users seeded successfully");
};
