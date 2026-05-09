import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, username, newPassword } = await request.json();

    if (!email || !username || !newPassword) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    // Find user by email AND username (double verification)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, role')
      .eq('email', email.trim().toLowerCase())
      .eq('username', username.trim())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'لا يوجد حساب مرتبط بهذا الإيميل واسم المستخدم' },
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
