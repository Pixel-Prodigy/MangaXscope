import "dotenv/config";
import { fullSync, incrementalSync, getSyncStatus } from "./manga-sync";

async function main() {
  const command = process.argv[2];

  if (!command || !["full", "incremental", "status"].includes(command)) {
    console.log("Usage: pnpm sync:<command>");
    console.log("Commands:");
    console.log("  full        - Run a full sync from MangaDex");
    console.log("  incremental - Run an incremental sync for recent updates");
    console.log("  status      - Check current sync status");
    process.exit(1);
  }

  console.log(`Running sync command: ${command}`);
  console.log("Database URL:", process.env.DATABASE_URL ? "Set" : "NOT SET");

  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  try {
    switch (command) {
      case "full": {
        console.log("\n=== Starting Full Sync ===\n");
        const startTime = Date.now();
        
        const result = await fullSync((progress) => {
          // Progress callback - could be used for real-time updates
          if (progress.totalToProcess > 0) {
            const percentage = ((progress.totalProcessed / progress.totalToProcess) * 100).toFixed(1);
            process.stdout.write(`\rProgress: ${progress.totalProcessed}/${progress.totalToProcess} (${percentage}%)`);
          }
        });

        const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
        
        console.log("\n");
        if (result.success) {
          console.log(`✅ Full sync completed successfully!`);
          console.log(`   Total manga processed: ${result.totalProcessed}`);
          console.log(`   Duration: ${duration} minutes`);
        } else {
          console.error(`❌ Full sync failed: ${result.error}`);
          process.exit(1);
        }
        break;
      }

      case "incremental": {
        console.log("\n=== Starting Incremental Sync ===\n");
        const startTime = Date.now();
        
        const result = await incrementalSync((progress) => {
          process.stdout.write(`\rProcessed: ${progress.totalProcessed} manga`);
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log("\n");
        if (result.success) {
          console.log(`✅ Incremental sync completed successfully!`);
          console.log(`   Total manga updated: ${result.totalProcessed}`);
          console.log(`   Duration: ${duration} seconds`);
        } else {
          console.error(`❌ Incremental sync failed: ${result.error}`);
          process.exit(1);
        }
        break;
      }

      case "status": {
        console.log("\n=== Sync Status ===\n");
        const status = await getSyncStatus();
        
        console.log(`Status: ${status.status}`);
        console.log(`Total manga in database: ${status.totalMangaCount}`);
        console.log(`Last full sync: ${status.lastFullSync?.toISOString() || "Never"}`);
        console.log(`Last incremental sync: ${status.lastIncrementalSync?.toISOString() || "Never"}`);
        if (status.lastError) {
          console.log(`Last error: ${status.lastError}`);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();


