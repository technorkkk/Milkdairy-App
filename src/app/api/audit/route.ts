import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    // Find the dairy to get the userId
    const { data: dairy } = await supabase
      .from("Dairy")
      .select("userId")
      .eq("id", dairyId)
      .maybeSingle();

    if (!dairy) {
      return NextResponse.json(
        { error: "Dairy not found" },
        { status: 404 }
      );
    }

    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 100;
    const limit = !isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 1000 ? parsedLimit : 100;

    let query = supabase
      .from("AuditLog")
      .select("*")
      .eq("userId", dairy.userId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (entity) {
      query = query.eq("entity", entity);
    }

    const { data: auditLogs, error } = await query;

    if (error) {
      console.error("GET /api/audit error:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    return NextResponse.json(auditLogs || []);
  } catch (error) {
    console.error("GET /api/audit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
