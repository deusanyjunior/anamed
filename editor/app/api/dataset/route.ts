// GET /api/dataset?path=anatomia/ossos.json
// PUT /api/dataset?path=anatomia/ossos.json  body: StudyDataset
import { NextRequest, NextResponse } from 'next/server';
import { readDataset, writeDataset } from '@/lib/fs';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('path');
  if (!p) return NextResponse.json({ error: 'missing path' }, { status: 400 });
  return NextResponse.json(readDataset(p));
}

export async function PUT(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('path');
  if (!p) return NextResponse.json({ error: 'missing path' }, { status: 400 });
  const body = await req.json();
  writeDataset(p, body);
  return NextResponse.json({ ok: true });
}
