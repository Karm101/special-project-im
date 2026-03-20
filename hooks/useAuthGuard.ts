"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * useAuthGuard — protects pages from unauthenticated access.
 *
 * Usage in any staff page:
 *   useAuthGuard('staff');
 *
 * Usage in any student page:
 *   useAuthGuard('student');
 *
 * How it works:
 * - Checks sessionStorage for auth token (staff) or student name (student)
 * - If not found, redirects to login page immediately
 * - No UI change needed on the page itself
 */
export function useAuthGuard(role: 'staff' | 'student') {
  const router = useRouter();

  useEffect(() => {
    if (role === 'staff') {
      const token = sessionStorage.getItem('auth_token');
      if (!token) {
        router.replace('/');
      }
    } else {
      const studentName = sessionStorage.getItem('student_name');
      if (!studentName) {
        router.replace('/');
      }
    }
  }, [role, router]);
}
