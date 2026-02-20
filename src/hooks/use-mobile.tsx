import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Return undefined on the server, and during the initial client-side render.
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // This effect runs only on the client.
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkDevice(); // Set the initial value on the client.
    window.addEventListener('resize', checkDevice); // Update on resize.

    // Cleanup listener on component unmount.
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []); // Empty dependency array ensures this runs only once on mount.

  return isMobile;
}
