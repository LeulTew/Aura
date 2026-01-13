/**
 * Phase 6A: Convert Event Temp to Permanent API Route
 * 
 * Converts event_temp photos to permanent storage by:
 * - Updating source_type to 'cloud'
 * - Clearing expires_at field
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

interface ConvertRequest {
  photoIds?: string[];  // Optional: specific photos to convert
  orgId: string;        // Required: organization to scope the conversion
  convertAll?: boolean; // If true, convert all event_temp photos for org
}

interface ConvertResponse {
  success: boolean;
  convertedCount?: number;
  message?: string;
  error?: string;
}

// POST: Convert event_temp photos to permanent
export async function POST(request: NextRequest): Promise<NextResponse<ConvertResponse>> {
  try {
    const supabase = getSupabaseAdmin();
    const body: ConvertRequest = await request.json();
    const { photoIds, orgId, convertAll = false } = body;

    if (!orgId) {
      return NextResponse.json({ success: false, error: 'orgId is required' }, { status: 400 });
    }

    let query = supabase
      .from('photos')
      .update({ 
        source_type: 'cloud',
        expires_at: null 
      })
      .eq('org_id', orgId)
      .eq('source_type', 'event_temp');

    // If specific photo IDs provided, filter by them
    if (photoIds && photoIds.length > 0 && !convertAll) {
      query = query.in('id', photoIds);
    }

    const { data, error } = await query.select('id');

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: `Conversion failed: ${error.message}` 
      }, { status: 500 });
    }

    const convertedCount = data?.length || 0;

    // Log the conversion action
    await supabase
      .from('usage_logs')
      .insert({
        org_id: orgId,
        action: 'convert_to_permanent',
        metadata: { 
          converted_count: convertedCount,
          converted_at: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      convertedCount,
      message: `${convertedCount} photo(s) converted to permanent storage.`
    });

  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// GET: Get count of event_temp photos for org
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ success: false, error: 'orgId is required' }, { status: 400 });
    }

    const { count, error } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('source_type', 'event_temp');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      eventTempCount: count || 0
    });

  } catch (error) {
    console.error('Count error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
