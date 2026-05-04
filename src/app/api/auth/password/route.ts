import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { authenticateUser, changePassword } from '@/lib/db-operations';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' }, { status: 400 });
    }

    // Verify current password
    const user = await authenticateUser(session.username, currentPassword);

    await changePassword(user.id, newPassword);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
