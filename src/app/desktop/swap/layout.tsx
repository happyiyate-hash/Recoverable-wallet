import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  // Desktop swap page layout without the main portfolio sidebar and header
  return <>{children}</>;
}
