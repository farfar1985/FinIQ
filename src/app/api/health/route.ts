import { NextResponse } from "next/server";

// Keep-alive / warm-up endpoint — ensures the Databricks warehouse stays running.
// Called on app load and periodically by the client to prevent auto-stop (10min idle timeout).

export async function GET() {
  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;
  const httpPath = process.env.DATABRICKS_HTTP_PATH;

  if (!host || !token || !httpPath) {
    return NextResponse.json({ status: "no-config", warehouse: "unknown" });
  }

  const warehouseId = httpPath.split("/").pop();
  if (!warehouseId) {
    return NextResponse.json({ status: "no-warehouse-id", warehouse: "unknown" });
  }

  try {
    const res = await fetch(
      `https://${host}/api/2.0/sql/warehouses/${warehouseId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      return NextResponse.json({ status: "error", warehouse: "unknown" });
    }

    const data = await res.json();
    const state = data.state as string;

    if (state === "RUNNING") {
      return NextResponse.json({ status: "ok", warehouse: "running" });
    }

    // Warehouse is stopped — kick-start it
    console.log(`[health] Warehouse is ${state}, starting...`);
    await fetch(
      `https://${host}/api/2.0/sql/warehouses/${warehouseId}/start`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );

    return NextResponse.json({ status: "warming", warehouse: state });
  } catch (err) {
    console.warn("[health] Warehouse check failed:", err);
    return NextResponse.json({ status: "error", warehouse: "unknown" });
  }
}
