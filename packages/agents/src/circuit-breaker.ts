type State = "closed" | "open" | "half_open";

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT_MS = 30_000;

let state: State = "closed";
let failureCount = 0;
let lastFailureTime = 0;

/**
 * Wraps an async function with circuit breaker protection.
 * After FAILURE_THRESHOLD consecutive failures, the circuit opens
 * for RESET_TIMEOUT_MS, during which the fallback is returned immediately.
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  fallback: () => T
): Promise<T> {
  if (state === "open") {
    if (Date.now() - lastFailureTime >= RESET_TIMEOUT_MS) {
      state = "half_open";
    } else {
      return fallback();
    }
  }

  try {
    const result = await fn();
    // Success: reset circuit
    if (state === "half_open") {
      state = "closed";
    }
    failureCount = 0;
    return result;
  } catch (error) {
    failureCount++;
    lastFailureTime = Date.now();

    if (failureCount >= FAILURE_THRESHOLD) {
      state = "open";
    }

    return fallback();
  }
}

/** Reset circuit breaker state (for testing). */
export function resetCircuitBreaker(): void {
  state = "closed";
  failureCount = 0;
  lastFailureTime = 0;
}
