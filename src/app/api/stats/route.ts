// src/app/api/stats/route.ts
// Aggregated stats endpoint — single DB query, 1-hour ISR cache.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

export async function GET(): Promise<NextResponse> {
  try {
    const [deliveredOrders, projects] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'DELIVERED' },
        select: { userId: true },
      }),
      prisma.project.findMany({
        where: { isVisible: true },
        select: { fileCount: true },
      }),
    ]);

    const totalFiles = projects.reduce(
      (sum, p) => sum + (typeof p.fileCount === 'number' ? p.fileCount : 0),
      0,
    );
    const uniqueClients = new Set(
      deliveredOrders.filter((o) => o.userId != null).map((o) => o.userId as string),
    ).size;

    return NextResponse.json({
      data: {
        deliveredOrders: deliveredOrders.length,
        totalFiles,
        happyClients: uniqueClients,
        avgBuildTimeDays: 7,
      },
    });
  } catch {
    return NextResponse.json(
      { data: { deliveredOrders: 0, totalFiles: 0, happyClients: 0, avgBuildTimeDays: 7 } },
    );
  }
}