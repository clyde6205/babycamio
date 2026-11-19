import { describe, expect, it } from "vitest";
import { PUBLIC_BASE, viewerLink, whatsappUrl, smsUrl } from "@/lib/share";

describe("private viewer links", () => {
  it("uses the canonical BabyCam domain", () => {
    expect(PUBLIC_BASE).toBe("https://babycam.io");
  });

  it("encodes an opaque invitation token in the viewer route", () => {
    const token = "e8f42c3a-1d5a-4c9b-a1e7-0f8c0c0a9b10";
    expect(viewerLink(token)).toBe(`https://babycam.io/viewer/${encodeURIComponent(token)}`);
  });

  it("does not turn room identifiers into a different route", () => {
    const token = "invite-token-with+reserved/chars";
    expect(viewerLink(token)).toContain(encodeURIComponent(token));
  });
});

describe("phone share fallbacks", () => {
  it("normalizes international WhatsApp phone numbers", () => {
    expect(whatsappUrl("Watch my camera", "+1 (415) 555-0132"))
      .toBe("https://wa.me/14155550132?text=Watch%20my%20camera");
  });

  it("preserves the plus sign for SMS phone numbers", () => {
    expect(smsUrl("BabyCam invite", "+63 917 123 4567"))
      .toBe("sms:+639171234567?body=BabyCam%20invite");
  });
});
