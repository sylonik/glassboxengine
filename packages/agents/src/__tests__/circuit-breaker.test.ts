import { describe, it, expect, beforeEach } from "vitest";
import { withCircuitBreaker, resetCircuitBreaker } from "../circuit-breaker";

describe("circuit breaker", () => {
  beforeEach(() => {
    resetCircuitBreaker();
  });

  it("returns function result when circuit is closed", async () => {
    const result = await withCircuitBreaker(
      async () => "success",
      () => "fallback"
    );
    expect(result).toBe("success");
  });

  it("returns fallback on function failure", async () => {
    const result = await withCircuitBreaker(
      async () => { throw new Error("fail"); },
      () => "fallback"
    );
    expect(result).toBe("fallback");
  });

  it("opens circuit after 5 consecutive failures", async () => {
    const fn = async () => { throw new Error("fail"); };
    const fallback = () => "fallback";

    // 5 failures should open the circuit
    for (let i = 0; i < 5; i++) {
      await withCircuitBreaker(fn, fallback);
    }

    // 6th call should use fallback immediately without calling fn
    let fnCalled = false;
    await withCircuitBreaker(
      async () => { fnCalled = true; return "should not reach"; },
      () => "circuit-open-fallback"
    );
    expect(fnCalled).toBe(false);
  });

  it("resets failure count after a successful call", async () => {
    const fallback = () => "fallback";

    // 3 failures (below threshold)
    for (let i = 0; i < 3; i++) {
      await withCircuitBreaker(async () => { throw new Error(); }, fallback);
    }

    // 1 success resets count
    await withCircuitBreaker(async () => "ok", fallback);

    // 4 more failures (still below threshold because count was reset)
    for (let i = 0; i < 4; i++) {
      await withCircuitBreaker(async () => { throw new Error(); }, fallback);
    }

    // fn should still be called (circuit still closed, only 4 consecutive failures)
    let fnCalled = false;
    await withCircuitBreaker(
      async () => { fnCalled = true; return "reached"; },
      fallback
    );
    expect(fnCalled).toBe(true);
  });

  it("resetCircuitBreaker clears state", async () => {
    const fallback = () => "fallback";

    // Open the circuit
    for (let i = 0; i < 5; i++) {
      await withCircuitBreaker(async () => { throw new Error(); }, fallback);
    }

    resetCircuitBreaker();

    // fn should be called again
    let fnCalled = false;
    await withCircuitBreaker(
      async () => { fnCalled = true; return "ok"; },
      fallback
    );
    expect(fnCalled).toBe(true);
  });
});
