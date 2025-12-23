import { ReactNode } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import PWADesktopBlock from './PWADesktopBlock';
import PlatformMobileBlock from './PlatformMobileBlock';

interface DeviceGateProps {
  children: ReactNode;
  allowMobile?: boolean;
  allowDesktop?: boolean;
  allowTablet?: boolean;
}

const DeviceGate = ({
  children,
  allowMobile = true,
  allowDesktop = true,
  allowTablet = true,
}: DeviceGateProps) => {
  const { isMobile, isDesktop, isTablet } = useDeviceDetection();

  // Tablet segue a configuração de allowTablet, se não permitido trata como mobile
  if (isTablet && !allowTablet) {
    if (!allowMobile) {
      return <PlatformMobileBlock />;
    }
  }

  // Mobile tentando acessar rota só desktop
  if (isMobile && !allowMobile) {
    return <PlatformMobileBlock />;
  }

  // Desktop tentando acessar rota só mobile (PWA)
  if (isDesktop && !allowDesktop) {
    return <PWADesktopBlock />;
  }

  return <>{children}</>;
};

export default DeviceGate;
