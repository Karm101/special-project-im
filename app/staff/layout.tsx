"use client";

import { useAuthGuard } from '../../hooks/useAuthGuard';
import { AppLayout } from '../components/drms/AppLayout';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  // One line protects ALL staff pages at once
  useAuthGuard('staff');

  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}
