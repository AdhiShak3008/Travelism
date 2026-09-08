"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthPage } from "@/components/ui/AuthPage";
import { useAuth } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  return <AuthPage standalone={true} />;
}
