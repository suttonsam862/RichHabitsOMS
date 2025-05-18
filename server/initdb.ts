import { db } from "./db";
import { roleEnum, users } from "@shared/schema";
import { hash } from "bcrypt";
import { eq, sql } from "drizzle-orm";

/**
 * Safe database initialization that checks for existing data before creating anything
 * This prevents data loss on application restarts
 */
export async function initializeDatabase() {
  try {
    console.log("Checking database initialization state...");
    
    // Check if admin user exists
    const adminExists = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, roleEnum.enumValues[0])) // 'admin'
      .execute();
    
    const adminCount = adminExists[0]?.count || 0;
    
    // Only initialize if no admin users exist
    if (adminCount === 0) {
      console.log("No admin users found. Initializing database with admin account...");
      
      // Create default admin user
      const hashedPassword = await hash('Arlodog2013!', 10);
      await db.insert(users).values({
        email: 'samsutton@rich-habits.com',
        username: 'samsutton',
        password: hashedPassword,
        firstName: 'Sam',
        lastName: 'Sutton',
        role: 'admin',
        createdAt: new Date(),
      });
      
      console.log("Admin user created successfully");
    } else {
      console.log(`Database already initialized with ${adminCount} admin users`);
    }
    
    return true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    return false;
  }
}