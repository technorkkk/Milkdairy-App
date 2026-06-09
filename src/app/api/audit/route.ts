import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/audit?dairyId=...&entity=...&limit=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dairyId = searchParams.get("dairyId");
    const entity = searchParams.get("entity");
    const limitParam = searchParams.get("limit");

    if (!dairyId) {
      return NextResponse.json(
        { error: "dairyId query parameter is required" },
        { status: 400 }
      );
    }

    // Find all user IDs for this dairy (the dairy belongs to a user)
    const dairy = await db.dairy.findUnique({
      where: { id: dairyId },
      select: { userId: true },
    });

    if (!dairy) {
      return NextResponse.json(
        { error: "Dairy not found" },
        { status: 404 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const where: Record<string, unknown> = {
      userId: dairy.userId,
    };
    if (entity) {
      where.entity = entity;
    }

    const auditLogs = await db.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json(auditLogs);
  } catch (error) {
    console.error("GET /api/audit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
