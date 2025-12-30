import { ReactNode, useState, useEffect } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { supabase } from '@/integrations/supabase/client';
import PWADesktopBlock from './PWADesktopBlock';
import { MobilePlatformView } from '../mobile/MobilePlatformView';

interface DeviceGateProps {
  children: ReactNode;
  allowMobile?: boolean;
  allowDesktop?: boolean;
  allowTablet?: boolean;
  mobileShowChat?: boolean;
}

const DeviceGate = ({
  children,
  allowMobile = true,
  allowDesktop = true,
  allowTablet = true,
  mobileShowChat = false,
}: DeviceGateProps) => {
  const { isMobile, isDesktop, isTablet } = useDeviceDetection();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  // Verificar se é admin quando em mobile
  useEffect(() => {
    if (!isMobile && !isTablet) {
      setCheckingRole(false);
      return;
    }

    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          setCheckingRole(false);
          return;
        }

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'superadmin'])
          .maybeSingle();

        setIsAdmin(!!roleData);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkAdminRole();
  }, [isMobile, isTablet]);

  // Tablet segue a configuração de allowTablet, se não permitido trata como mobile
  if (isTablet && !allowTablet) {
    if (!allowMobile) {
      if (checkingRole) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        );
      }
      return <MobilePlatformView isAdmin={isAdmin} />;
    }
  }

  // Mobile tentando acessar rota com mobileShowChat ativo
  if (isMobile && mobileShowChat) {
    if (checkingRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    return <MobilePlatformView isAdmin={isAdmin} />;
  }

  // Mobile tentando acessar rota só desktop (comportamento antigo - agora mostra chat)
  if (isMobile && !allowMobile) {
    if (checkingRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    return <MobilePlatformView isAdmin={isAdmin} />;
  }

  // Desktop tentando acessar rota só mobile (PWA)
  if (isDesktop && !allowDesktop) {
    return <PWADesktopBlock />;
  }

  return <>{children}</>;
};

export default DeviceGate;
