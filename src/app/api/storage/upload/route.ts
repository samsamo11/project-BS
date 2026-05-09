import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Allowed file types for upload
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/storage/upload
 * Upload a file to Supabase Storage.
 * Query params: bucket (default: "images"), folder (default: "uploads")
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await requireAuth();

    const bucket = request.nextUrl.searchParams.get('bucket') || 'evaluation-images';
    const ALLOWED_FOLDERS = ['uploads'];
    const folder = request.nextUrl.searchParams.get('folder') || 'uploads';
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'مجلد غير صالح' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'لم يتم تقديم أي ملف' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, GIF, WebP, PDF' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'حجم الملف يتجاوز الحد المسموح (5 ميجابايت)' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9._\u0600-\u06FF-]/g, '_');
    const filePath = `${folder}/${timestamp}-${sanitizedOriginalName}`;

    // Convert File to ArrayBuffer for Supabase upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[Storage Upload Error]', error);
      return NextResponse.json(
        { error: 'فشل رفع الملف' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);
    const publicUrl = urlData.publicUrl;

    return NextResponse.json(
      {
        url: publicUrl,
        path: data.path,
        bucket,
        message: 'تم رفع الملف بنجاح',
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل رفع الملف';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'غير مصرح به' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    console.error('[Storage Upload Error]', error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
