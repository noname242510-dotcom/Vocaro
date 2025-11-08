'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');

  const [activeSection, setActiveSection] = useState<string | null>(sectionParam || 'profile');

  // Sync state with URL changes (e.g., browser back/forward)
  useEffect(() => {
    setActiveSection(sectionParam || (isMobile ? activeSection : 'profile'));
  }, [sectionParam, isMobile]);

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
        return null;
    }
  };

  const handleMenuSelect = (section: string) => {
    setActiveSection(section);
  };
  
  const handleMobileBack = () => {
    setActiveSection(null);
  };

  return (
    <SettingsLayout
      menu={<SettingsMenu onSelect={handleMenuSelect} />}
      showMenuOnMobile={!activeSection} 
      onMobileBack={handleMobileBack}
    >
      {renderSection()}
    </SettingsLayout>
  );
}
