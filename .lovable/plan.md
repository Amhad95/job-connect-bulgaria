

## Fix: Switch Apply Kit AI to Lovable AI Gateway

### Problem
The `callAI` function in `apply-kit-start-generation` and `apply-kit-refine-generation` tries Supabase built-in AI (mistral model, not supported) then falls back to OpenAI (no key configured). Both fail.

### Solution
Replace the `callAI` function in both edge functions to use the Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) with the pre-configured `LOVABLE_API_KEY` secret and `google/gemini-3-flash-preview` model.

The `apply-kit-finalize-generation` function does NOT call AI, so no changes needed there.

### Changes

**1. `supabase/functions/apply-kit-start-generation/index.ts`** — Replace `callAI` (lines 114-164):
```typescript
async function callAI(
    messages: Array<{ role: string; content: string }>
): Promise<string> {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages,
            temperature: 0.2,
            max_tokens: 4000,
        }),
    });

    if (res.status === 429) throw new Error("Rate limited. Please try again later.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    if (!res.ok) {
        const t = await res.text();
        throw new Error("AI gateway error: " + t);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned no content");
    return content;
}
```

**2. `supabase/functions/apply-kit-refine-generation/index.ts`** — Same replacement for its `callAI` function (lines 27-63).

No other files need changes.

