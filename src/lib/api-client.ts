
/**
 * INSTITUTIONAL API CLIENT
 * A hardened wrapper around the native fetch() API.
 * Features automatic error handling and standardized response parsing.
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Perform a GET request with strict error boundaries.
 */
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // 1. VERIFY NODE: response.ok is true if status is 200-299
    if (!response.ok) {
      return {
        data: null,
        error: `Institutional Error: Node returned ${response.status} ${response.statusText}`,
        status: response.status,
      };
    }

    // 2. PARSE NODE: Extract the JSON payload
    const data = await response.json();

    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (error: any) {
    // 3. CATCH NODE: Handle network-level failures (e.g., DNS, Timeout)
    return {
      data: null,
      error: error.message || 'Registry connection failed. Handshake interrupted.',
      status: 0,
    };
  }
}

/**
 * Perform a POST request with payload authorization.
 */
export async function apiPost<T>(url: string, body: any): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Submission Failure: ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (error: any) {
    return { data: null, error: error.message, status: 0 };
  }
}
