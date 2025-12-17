import { NextRequest, NextResponse } from "next/server";
import { fullSync, incrementalSync, getSyncStatus } from "@/lib/sync";

/**
 * GET /api/sync - Get current sync status
 */
export async function GET() {
  try {
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync - Trigger a sync operation
 * Requires SYNC_API_SECRET header for authentication
 * Body: { type: "full" | "incremental" }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API secret
    const apiSecret = request.headers.get("x-sync-api-secret");
    const expectedSecret = process.env.SYNC_API_SECRET;

    if (!expectedSecret) {
      console.error("SYNC_API_SECRET not configured");
      return NextResponse.json(
        { error: "Sync API not configured" },
        { status: 500 }
      );
    }

    if (apiSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if already syncing
    const currentStatus = await getSyncStatus();
    if (currentStatus.status === "SYNCING") {
      return NextResponse.json(
        { error: "Sync already in progress", status: currentStatus },
        { status: 409 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const syncType = body.type || "incremental";

    if (!["full", "incremental"].includes(syncType)) {
      return NextResponse.json(
        { error: "Invalid sync type. Use 'full' or 'incremental'" },
        { status: 400 }
      );
    }

    // Start sync in background (don't await)
    const syncPromise = syncType === "full" ? fullSync() : incrementalSync();
    
    // Fire and forget - the sync will run in the background
    syncPromise.then((result) => {
      console.log(`${syncType} sync completed:`, result);
    }).catch((error) => {
      console.error(`${syncType} sync failed:`, error);
    });

    return NextResponse.json({
      message: `${syncType} sync started`,
      type: syncType,
    });
  } catch (error) {
    console.error("Error starting sync:", error);
    return NextResponse.json(
      { error: "Failed to start sync" },
      { status: 500 }
    );
  }
}


