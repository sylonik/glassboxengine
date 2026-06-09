export interface DeviceInfo {
  deviceType: string;
  browser: string;
  os: string;
  screenWidth: number;
  screenHeight: number;
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return { deviceType: "", browser: "", os: "", screenWidth: 0, screenHeight: 0 };
  }

  const ua = navigator.userAgent;

  return {
    deviceType: detectDeviceType(),
    browser: detectBrowser(ua),
    os: detectOS(ua),
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
  };
}

function detectDeviceType(): string {
  if (typeof window === "undefined") return "";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function detectBrowser(ua: string): string {
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera/")) return "Opera";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  return "Other";
}

function detectOS(ua: string): string {
  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux") && !ua.includes("Android")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "Other";
}
