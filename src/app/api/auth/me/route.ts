import { NextResponse } from 'next/server';
import { getSession, clearSessionResponse } from '@/lib/auth';
import { getUserById } from '@/lib/db-operations';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    let user: { id: string; username: string; full_name: string; role: string };
    try {
      user = await getUserById(session.userId);
    } catch {
      // User was deleted from DB but JWT is still valid — clear the session
      return clearSessionResponse('الجلسة منتهية، يرجى تسجيل الدخول مجدداً', 401);
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'خطأ في التحقق من الجلسة' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
