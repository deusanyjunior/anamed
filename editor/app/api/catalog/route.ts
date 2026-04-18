// API route: GET /api/catalog  → retorna estudos.json
// API route: PUT /api/catalog  → salva estudos.json
import { NextRequest, NextResponse } from 'next/server';
import { readCatalog, writeCatalog } from '@/lib/fs';

export async function GET() {
  return NextResponse.json(readCatalog());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  writeCatalog(body);
  return NextResponse.json({ ok: true });
}
