import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const file = path.join(process.cwd(), 'public', 'anlurich-app.apk');
    const data = await readFile(file);
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="Anlurich-APP.apk"',
        'Content-Length': String(data.length),
      },
    });
  } catch {
    return NextResponse.json({ error: 'App file is missing. Upload public/anlurich-app.apk.' }, { status: 404 });
  }
}
