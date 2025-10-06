'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { PropsWithChildren, useState, useEffect } from 'react';

export default function MainContentWrapper({ children }: PropsWithChildren) {
  const isMobile = useIsMobile();
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default expanded width

  useEffect(() => {
    // Listen for sidebar collapse state changes
    const handleSidebarChange = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        const width = sidebar.offsetWidth;
        setSidebarWidth(width);
      }
    };

    // Initial check
    handleSidebarChange();

    // Use ResizeObserver to watch for sidebar width changes
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      const resizeObserver = new ResizeObserver(handleSidebarChange);
      resizeObserver.observe(sidebar);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <main
      id="skip"
      className="min-h-screen transition-all duration-300"
      style={{
        paddingLeft: isMobile ? 0 : sidebarWidth,
        paddingTop: isMobile ? '3.5rem' : 0, // 14 * 0.25rem = 3.5rem
      }}
    >
      <div className="p-4 md:p-6">
        {children}
      </div>
    </main>
  );
}
