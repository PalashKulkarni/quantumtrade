"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Onboarding is disabled in demo mode — redirect to dashboard immediately. */
export default function OnboardingPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
