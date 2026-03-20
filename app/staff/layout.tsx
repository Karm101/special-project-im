"use client";

import { usePathname } from 'next/navigation';
import { AppLayout } from '../components/drms/AppLayout';
import { useAuthGuard } from '../../hooks/useAuthGuard';

// Separate component so hook is always called at top level
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  useAuthGuard('staff');
  return <AppLayout>{children}</AppLayout>;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // /staff/login gets no sidebar and no auth guard
  if (pathname === '/staff/login') {
    return <>{children}</>;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}
