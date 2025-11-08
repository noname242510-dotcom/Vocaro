'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { SettingsLayout } from './_components/settings-layout';
import { SettingsMenu } from './_components/settings-menu';
import { ProfileSettings } from './_components/profile-settings';
import { AppearanceSettings } from './_components/appearance-settings';
import { VocabSettings } from './_components/vocab-settings';
import { VerbSettings } from './_components/verb-settings';
import { LanguageSettings } from './_components/language-settings';
import { AccountSettings } from './_components/account-settings';

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');
  const isMobile = useIsMobile();
  
  // On mobile, if a section is in the URL, show it. Otherwise, show the menu (null).
  // On desktop, default to 'profile' if no section is in the URL.
  const [activeSection, setActiveSection] = useState<string | null>(
    sectionParam || (isMobile ? null : 'profile')
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'vocabulary':
        return <VocabSettings />;
      case 'verbs':
        return <VerbSettings />;
      case 'language':
        return <LanguageSettings />;
      case 'account':
        return <AccountSettings />;
      default:
        // On desktop, if no section is active, default to profile
        return isMobile ? null : <ProfileSettings />;
    }
  };

  const handleMenuSelect = (section: string) => {
    setActiveSection(section);
    // On desktop, we update the URL. On mobile, we just change the state.
    if (!isMobile) {
        const params = new URLSearchParams(searchParams);
        params.set('section', section);
        router.replace(`${pathname}?${params.toString()}`);
    }
  };
  
  const handleMobileBack = () => {
    setActiveSection(null);
    router.replace(pathname);
  };

  return (
    <SettingsLayout
      menu={<SettingsMenu onSelect={handleMenuSelect} />}
      showMenuOnMobile={isMobile && !activeSection} 
      onMobileBack={handleMobileBack}
    >
      {renderSection()}
    </SettingsLayout>
  );
}
