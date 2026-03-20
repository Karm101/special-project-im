"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * useAuthGuard — protects pages from unauthenticated access.
 *
 * Usage in any staff page:   useAuthGuard('staff');
 * Usage in any student page: useAuthGuard('student');
 *
 * Staff → redirects to /staff/login if not authenticated
 * Student → redirects to / if not authenticated
 */
export function useAuthGuard(role: 'staff' | 'student') {
  const router = useRouter();

  useEffect(() => {
    if (role === 'staff') {
      const token = sessionStorage.getItem('auth_token');
      if (!token) router.replace('/staff/login');
    } else {
      const token = sessionStorage.getItem('student_token');
      if (!token) router.replace('/');
    }
  }, [role, router]);
}
