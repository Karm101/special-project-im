"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuthGuard(role: 'staff' | 'student' | 'admin') {
  const router = useRouter();

  useEffect(() => {
    if (role === 'staff' || role === 'admin') {
      const token = sessionStorage.getItem('auth_token');
      if (!token) { router.replace('/staff/login'); return; }

      if (role === 'admin') {
        const staffRole = sessionStorage.getItem('staff_role');
        if (staffRole !== 'Super Admin') {
          router.replace('/staff/dashboard');
          return;
        }
      }
    } else {
      const token = sessionStorage.getItem('student_token');
      if (!token) router.replace('/');
    }
  }, [role, router]);
}