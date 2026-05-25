"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Auth is disabled in demo mode — redirect to dashboard immediately. */
export default function SignupPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
