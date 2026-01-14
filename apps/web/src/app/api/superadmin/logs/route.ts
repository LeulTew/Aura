
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
        .from('usage_logs')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ data });
}
