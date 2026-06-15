// Detects in-app browsers (LinkedIn, Instagram, Facebook, etc.). Google OAuth
// refuses to run in these embedded webviews ("disallowed_useragent"), so we
// prompt the user to open the site in a real browser instead.
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const markers = [
    "LinkedInApp",
    "FBAN",
    "FBAV",
    "Instagram",
    "Twitter",
    "Line/",
    "MicroMessenger", // WeChat
    "Snapchat",
    "musical_ly", // TikTok
    "Bytedance",
    "TikTok",
    "; wv)", // generic Android WebView
  ];
  return markers.some((m) => ua.includes(m));
}

export function mobileOS(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

// Android can hand off to the default browser via an intent URL. iOS has no
// public way to leave an in-app webview, so we return false and fall back to
// showing instructions.
export function openInDefaultBrowser(url = "https://usekronos.tech"): boolean {
  if (mobileOS() === "android") {
    const noScheme = url.replace(/^https?:\/\//, "");
    window.location.href = `intent://${noScheme}#Intent;scheme=https;end`;
    return true;
  }
  return false;
}
