import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Figures out where "Launch" should actually take you: prefer the
// auto-detected port on the current host, fall back to a stored URL
// (rewriting localhost/127.0.0.1 references so they work from whatever
// device you're viewing the dashboard on, not just the server itself).
export function getLaunchUrl(service) {
  const detectedPort =
    service.port ||
    (Array.isArray(service.ports) && service.ports.find((p) => p.PublicPort)?.PublicPort);

  if (detectedPort) {
    return `${window.location.protocol}//${window.location.hostname}:${detectedPort}`;
  }

  if (service.url && service.url !== "#") {
    try {
      const parsed = new URL(service.url);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        parsed.hostname = window.location.hostname;
        parsed.protocol = window.location.protocol;
      }
      return parsed.toString();
    } catch {
      return service.url;
    }
  }
  return null;
}
