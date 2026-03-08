

## Store TheirStack API Key

The `THEIRSTACK_API_KEY` secret needs to be added to your backend so the `import-theirstack` edge function can authenticate with the TheirStack API.

### What will be done

1. **Add the secret** `THEIRSTACK_API_KEY` with the value you provided to your backend's secure secret storage
2. **Verify** the `import-theirstack` edge function can access it by checking it references `Deno.env.get("THEIRSTACK_API_KEY")` (already confirmed in the existing code)

No code changes are needed — just the secret needs to be stored.

