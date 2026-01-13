/**
 * Phase 6C: Trash Management API Route
 * 
 * Handles soft-delete and restore operations for photos:
 * - POST: Move photo to trash
 * - PUT: Restore photo from trash
 * - DELETE: Permanently delete from trash
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key);
}

interface TrashRequest {
  photoId: string;
  orgSlug: string;
}

interface TrashResponse {
  success: boolean;
  trashPath?: string;
  originalPath?: string;
  message?: string;
  error?: string;
}

// POST: Move photo to trash
export async function POST(request: NextRequest): Promise<NextResponse<TrashResponse>> {
  try {
    const supabase = getSupabaseAdmin();
    const body: TrashRequest = await request.json();
    const { photoId, orgSlug } = body;

    if (!photoId || !orgSlug) {
      return NextResponse.json({ success: false, error: 'photoId and orgSlug are required' }, { status: 400 });
    }

    // 1. Get photo record
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('full_path, org_id')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    const originalPath = photo.full_path;
    const timestamp = Date.now();
    const trashPath = `${orgSlug}/.trash/${timestamp}_${originalPath.split('/').pop()}`;

    // 2. Copy to trash location
    const { error: copyError } = await supabase.storage
      .from('photos')
      .copy(originalPath, trashPath);

    if (copyError) {
      return NextResponse.json({ success: false, error: `Failed to move to trash: ${copyError.message}` }, { status: 500 });
    }

    // 3. Delete original
    const { error: deleteError } = await supabase.storage
      .from('photos')
      .remove([originalPath]);

    if (deleteError) {
      console.error('Failed to delete original after trash copy:', deleteError);
    }

    // 4. Update database record
    const { error: updateError } = await supabase
      .from('photos')
      .update({ 
        full_path: trashPath,
        metadata: { 
          trashed: true, 
          trashed_at: new Date().toISOString(),
          original_path: originalPath
        }
      })
      .eq('id', photoId);

    if (updateError) {
      console.error('Failed to update photo record:', updateError);
    }

    return NextResponse.json({
      success: true,
      trashPath,
      originalPath,
      message: 'Photo moved to trash. It will be permanently deleted after 30 days.'
    });

  } catch (error) {
    console.error('Trash error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// PUT: Restore photo from trash
export async function PUT(request: NextRequest): Promise<NextResponse<TrashResponse>> {
  try {
    const supabase = getSupabaseAdmin();
    const body: TrashRequest = await request.json();
    const { photoId } = body;

    if (!photoId) {
      return NextResponse.json({ success: false, error: 'photoId is required' }, { status: 400 });
    }

    // 1. Get photo record with original path from metadata
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('full_path, metadata')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    const originalPath = photo.metadata?.original_path;
    if (!originalPath) {
      return NextResponse.json({ success: false, error: 'Original path not found in metadata' }, { status: 400 });
    }

    const trashPath = photo.full_path;

    // 2. Copy back to original location
    const { error: copyError } = await supabase.storage
      .from('photos')
      .copy(trashPath, originalPath);

    if (copyError) {
      return NextResponse.json({ success: false, error: `Failed to restore: ${copyError.message}` }, { status: 500 });
    }

    // 3. Delete from trash
    const { error: deleteError } = await supabase.storage
      .from('photos')
      .remove([trashPath]);

    if (deleteError) {
      console.error('Failed to delete trash copy:', deleteError);
    }

    // 4. Update database record
    const { error: updateError } = await supabase
      .from('photos')
      .update({ 
        full_path: originalPath,
        metadata: { 
          trashed: false, 
          restored_at: new Date().toISOString()
        }
      })
      .eq('id', photoId);

    if (updateError) {
      console.error('Failed to update photo record:', updateError);
    }

    return NextResponse.json({
      success: true,
      trashPath,
      originalPath,
      message: 'Photo restored successfully.'
    });

  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE: Permanently delete from trash
export async function DELETE(request: NextRequest): Promise<NextResponse<TrashResponse>> {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json({ success: false, error: 'photoId is required' }, { status: 400 });
    }

    // 1. Get photo record
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('full_path, metadata')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    // Verify it's in trash
    if (!photo.metadata?.trashed) {
      return NextResponse.json({ success: false, error: 'Photo is not in trash' }, { status: 400 });
    }

    // 2. Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('photos')
      .remove([photo.full_path]);

    if (deleteError) {
      console.error('Failed to delete from storage:', deleteError);
    }

    // 3. Delete database record
    const { error: dbDeleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);

    if (dbDeleteError) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to delete record: ${dbDeleteError.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Photo permanently deleted.'
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// GET: List trash contents
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ success: false, error: 'orgId is required' }, { status: 400 });
    }

    // Get trashed photos for org
    const { data: trashedPhotos, error } = await supabase
      .from('photos')
      .select('id, full_path, metadata, created_at')
      .eq('org_id', orgId)
      .eq('metadata->>trashed', 'true')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: trashedPhotos?.length || 0,
      photos: trashedPhotos || []
    });

  } catch (error) {
    console.error('List trash error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
