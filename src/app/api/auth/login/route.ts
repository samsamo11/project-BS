import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { authenticateUser, isDeviceAllowed } from '@/lib/db-operations';

export async function POST(request: NextRequest) {
  try {
    const { username, password, deviceId } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const user = await authenticateUser(username, password);

    // Check device binding (skip for admin)
    if (user.role !== 'admin' && deviceId) {
      const allowed = await isDeviceAllowed(user.id, deviceId);
      if (!allowed) {
        return NextResponse.json(
          { error: 'هذا الجهاز غير مصرح به. تواصل مع المدير لتفعيل جهازك.', code: 'DEVICE_NOT_AUTHORIZED' },
          { status: 403 }
        );
      }
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      deviceId,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });

    response.cookies.set('bs-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ في تسجيل الدخول';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
