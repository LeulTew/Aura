
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, slug, plan, storage_limit_gb } = body;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !serviceKey) {
            throw new Error(`Missing config: URL=${!!supabaseUrl}, Key=${!!serviceKey} (Check .env.local for SUPABASE_SERVICE_ROLE_KEY)`);
        }

        // Init Service Role Client (Bypasses RLS)
        const supabase = createClient(supabaseUrl, serviceKey);

        // Insert Organization
        const { data, error } = await supabase
            .from('organizations')
            .insert({
                name,
                slug,
                plan,
                storage_limit_gb,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
