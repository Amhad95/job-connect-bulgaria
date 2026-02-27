import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

const isBulgarian = (text: string | null) => /[а-яА-Я]/.test(text || '');

const DICTIONARY_MAPS = {
    locations: {
        'sofia': { slug: 'sofia', name_en: 'Sofia', name_bg: 'София' },
        'софия': { slug: 'sofia', name_en: 'Sofia', name_bg: 'София' },
        'plovdiv': { slug: 'plovdiv', name_en: 'Plovdiv', name_bg: 'Пловдив' },
        'пловдив': { slug: 'plovdiv', name_en: 'Plovdiv', name_bg: 'Пловдив' },
        'varna': { slug: 'varna', name_en: 'Varna', name_bg: 'Варна' },
        'варна': { slug: 'varna', name_en: 'Varna', name_bg: 'Варна' },
        'remote': { slug: 'remote', name_en: 'Remote', name_bg: 'Дистанционно' },
        'дистанционно': { slug: 'remote', name_en: 'Remote', name_bg: 'Дистанционно' },
        'burgas': { slug: 'burgas', name_en: 'Burgas', name_bg: 'Бургас' },
        'бургас': { slug: 'burgas', name_en: 'Burgas', name_bg: 'Бургас' },
        'ruse': { slug: 'ruse', name_en: 'Ruse', name_bg: 'Русе' },
        'русе': { slug: 'ruse', name_en: 'Ruse', name_bg: 'Русе' },
    }
};

async function runMigration() {
    console.log("Starting Migration...");

    // 1. Seed Dictionary Tables
    const uniqueLocations = Object.values(
        Object.values(DICTIONARY_MAPS.locations).reduce((acc: any, loc) => ({ ...acc, [loc.slug]: loc }), {})
    );

    const { data: insertedLocations, error: errLoc } = await supabase.from('locations').upsert(uniqueLocations, { onConflict: 'slug' }).select();
    if (errLoc) { console.error("Error inserting locations:", errLoc); return; }
    const locSlugToId = insertedLocations.reduce((acc: any, loc: any) => ({ ...acc, [loc.slug]: loc.id }), {});

    // 2. Fetch all existing jobs and content
    // Cannot query job_posting_content joined if there are FK issues temporarily, but we'll try!
    const { data: jobs, error: errJobs } = await supabase
        .from('job_postings')
        .select(`*, job_posting_content(id, description_text)`);

    if (errJobs) { console.error("Error fetching jobs:", errJobs); return; }

    console.log(`Migrating ${jobs.length} jobs...`);
    let updatedCount = 0;

    for (const job of jobs) {
        const isBgTitle = isBulgarian(job.title);

        // Determine language fields
        const title_bg = isBgTitle ? job.title : null;
        const title_en = !isBgTitle ? job.title : null;
        const external_url = job.apply_url || job.canonical_url;

        // Update structural row
        const { error: updErr } = await supabase.from('job_postings').update({
            title_bg,
            title_en,
            source_type: 'EXTERNAL',
            external_url
        }).eq('id', job.id);

        if (updErr) { console.error(`Failed to update job ${job.id}:`, updErr); }

        // Update Relational Content
        const contentArr = Array.isArray(job.job_posting_content) ? job.job_posting_content : (job.job_posting_content ? [job.job_posting_content] : []);
        for (const content of contentArr) {
            if (content?.description_text) {
                const isBgDesc = isBulgarian(content.description_text);
                await supabase.from('job_posting_content').update({
                    description_bg: isBgDesc ? content.description_text : null,
                    description_en: !isBgDesc ? content.description_text : null
                }).eq('id', content.id);
            }
        }

        // Connect standard Location mapping
        const rawLoc = (job.location_city || "").toLowerCase();
        const mappedLocInfo = (DICTIONARY_MAPS.locations as any)[rawLoc];

        let slug = mappedLocInfo ? mappedLocInfo.slug : null;
        if (!slug && job.work_mode === 'remote') {
            slug = 'remote';
        } else if (!slug && rawLoc) {
            // Fallback slug generation for unknown cities
            slug = rawLoc.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            // Upsert dynamic location
            const { data: newLoc } = await supabase.from('locations').upsert({ slug, name_en: rawLoc, name_bg: rawLoc }, { onConflict: 'slug' }).select().single();
            if (newLoc) locSlugToId[slug] = newLoc.id;
        }

        if (slug) {
            const locId = locSlugToId[slug];
            if (locId) {
                await supabase.from('job_locations').upsert({ job_id: job.id, location_id: locId });
            }
        }

        updatedCount++;
        if (updatedCount % 50 === 0) console.log(`Processed ${updatedCount} jobs...`);
    }

    console.log("Migration Complete!");
}

runMigration().catch(console.error);
