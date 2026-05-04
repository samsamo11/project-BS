import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createUser, getAllUsers, getDevicesByUser } from '@/lib/db-operations';

export async function GET() {
  try {
    await requireAdmin();
    const users = await getAllUsers();

    const usersWithDevices = await Promise.all(
      users.map(async (user) => {
        const devices = await getDevicesByUser(user.id);
        return { ...user, devices };
      })
    );

    return NextResponse.json(usersWithDevices);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { username, password, fullName } = await request.json();

    if (!username || !password || !fullName) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' }, { status: 400 });
    }

    const user = await createUser(username, password, fullName, 'user');
    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 400 });
  }
}
