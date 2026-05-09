import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, newPassword, confirmPassword } = await request.json();

    if (!username || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'كلمات المرور غير متطابقة' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 });
    }

    // Find user by username
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, role')
      .eq('username', username.trim())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'لا يوجد حساب مرتبط باسم المستخدم' },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'فشل تحديث كلمة المرور' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
