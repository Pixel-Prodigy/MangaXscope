import { NextResponse } from "next/server";
import { getSyncStatus } from "@/lib/sync";

/**
 * GET /api/sync/status - Get detailed sync status
 * Public endpoint for checking sync status
 */
export async function GET() {
  try {
    const status = await getSyncStatus();
    
    return NextResponse.json({
      ...status,
      // Add formatted timestamps
      lastFullSyncFormatted: status.lastFullSync 
        ? new Date(status.lastFullSync).toLocaleString() 
        : null,
      lastIncrementalSyncFormatted: status.lastIncrementalSync 
        ? new Date(status.lastIncrementalSync).toLocaleString() 
        : null,
    });
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}


