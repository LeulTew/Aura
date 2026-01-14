
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Run parallel queries for speed
    const [orgs, photos] = await Promise.all([
        supabase.from('organizations').select('is_active, storage_used_bytes'),
        supabase.from('photos').select('*', { count: 'exact', head: true })
    ]);

    const organizationData = orgs.data || [];
    
    // Aggregate stats
    const stats = {
        total_tenants: organizationData.length,
        active_tenants: organizationData.filter(o => o.is_active).length,
        total_photos: photos.count || 0,
        total_storage_gb: organizationData.reduce((acc, o) => acc + (o.storage_used_bytes || 0), 0) / (1024 * 1024 * 1024)
    };

    return NextResponse.json({ data: stats });
}
