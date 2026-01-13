/**
 * Phase 6A: Image Optimization API Route
 * 
 * Generates optimized WebP variants of uploaded photos:
 * - full/ : 2000px max dimension, 85% quality
 * - thumbs/ : 400px max dimension, 80% quality
 * 
 * @see https://sharp.pixelplumbing.com/
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key);
}

interface OptimizeRequest {
  path: string;  // Path to original file in Supabase storage
  generateThumbs?: boolean;  // Default: true
  generateFull?: boolean;    // Default: true
}

interface OptimizeResponse {
  success: boolean;
  fullPath?: string;
  thumbPath?: string;
  originalSize?: number;
  fullSize?: number;
  thumbSize?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<OptimizeResponse>> {
  try {
    const supabase = getSupabaseAdmin();
    const body: OptimizeRequest = await request.json();

    const { path, generateThumbs = true, generateFull = true } = body;

    if (!path) {
      return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
    }

    // 1. Download original image from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('photos')
      .download(path);

    if (downloadError || !fileData) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to download: ${downloadError?.message || 'File not found'}` 
      }, { status: 404 });
    }

    // Convert Blob to Buffer
    const originalBuffer = Buffer.from(await fileData.arrayBuffer());
    const originalSize = originalBuffer.length;

    // 2. Parse path to construct optimized paths
    // Expected format: {org_slug}/{year}/{event}/originals/{filename}
    // Output format: {org_slug}/{year}/{event}/optimized/{full|thumbs}/{filename}.webp
    const pathParts = path.split('/');
    const filename = pathParts.pop() || 'image';
    const filenameWithoutExt = filename.replace(/\.[^.]+$/, '');
    const basePath = pathParts.join('/').replace('/originals', '');

    let fullPath: string | undefined;
    let thumbPath: string | undefined;
    let fullSize: number | undefined;
    let thumbSize: number | undefined;

    // 3. Generate full-size optimized version (2000px max)
    if (generateFull) {
      const fullBuffer = await sharp(originalBuffer)
        .resize(2000, 2000, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .webp({ quality: 85 })
        .toBuffer();

      fullPath = `${basePath}/optimized/full/${filenameWithoutExt}.webp`;
      fullSize = fullBuffer.length;

      const { error: uploadFullError } = await supabase.storage
        .from('photos')
        .upload(fullPath, fullBuffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadFullError) {
        console.error('Full upload error:', uploadFullError);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to upload full: ${uploadFullError.message}` 
        }, { status: 500 });
      }
    }

    // 4. Generate thumbnail (400px max)
    if (generateThumbs) {
      const thumbBuffer = await sharp(originalBuffer)
        .resize(400, 400, { 
          fit: 'cover',
          position: 'attention'  // Smart crop focusing on interesting areas
        })
        .webp({ quality: 80 })
        .toBuffer();

      thumbPath = `${basePath}/optimized/thumbs/${filenameWithoutExt}.webp`;
      thumbSize = thumbBuffer.length;

      const { error: uploadThumbError } = await supabase.storage
        .from('photos')
        .upload(thumbPath, thumbBuffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadThumbError) {
        console.error('Thumb upload error:', uploadThumbError);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to upload thumb: ${uploadThumbError.message}` 
        }, { status: 500 });
      }
    }

    // 5. Return success with size comparison
    return NextResponse.json({
      success: true,
      fullPath,
      thumbPath,
      originalSize,
      fullSize,
      thumbSize
    });

  } catch (error) {
    console.error('Optimization error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// GET handler for health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'image-optimize',
    version: '1.0.0',
    capabilities: ['webp', 'resize', 'thumbnail']
  });
}
