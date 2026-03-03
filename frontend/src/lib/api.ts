const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/^http:\/\//, 'https://').replace(/\/+$/, '');

export { API_URL };

/**
 * Fetch wrapper with retry logic for HuggingFace Space cold starts.
 * Retries up to `maxRetries` times with increasing delay.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[API] Attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}:`, lastError.message);

      // Only retry on network/fetch errors
      if (!(err instanceof TypeError)) {
        throw lastError;
      }

      // Wait before retrying (2s, then 4s)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
      }
    }
  }

  throw lastError || new Error('Unable to connect to the server. Please try again.');
}
