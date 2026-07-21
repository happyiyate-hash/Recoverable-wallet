'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import SwapClient from './page';
import DesktopSwap from '@/components/swap/DesktopSwap';

export default function ResponsiveSwap() {
  const isMobile = useIsMobile();

  if (isMobile === undefined) {
    return null; // or a loading skeleton
  }

  return isMobile ? <SwapClient /> : <DesktopSwap />;
}
