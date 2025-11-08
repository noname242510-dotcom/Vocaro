'use client';

import { useState, useMemo } from 'react';
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

  // activeSection determines what is shown. On mobile, if null, show menu.
  // On desktop, it falls back to 'profile'.
  const [activeSection, setActiveSection] = useState<string | null>(
    // On initial mobile load, we want to show the menu, so start with null.
    isMobile ? null : sectionParam || 'profile'
  );

  // If the URL param changes on desktop, update the view.
  // This syncs browser back/forward with the component state.
  useMemo(() => {
    if (!isMobile) {
      setActiveSection(sectionParam || 'profile');
    }
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
        // On mobile, if no section is selected, we show the menu.
        // On desktop, we default to profile.
        return isMobile ? null : <ProfileSettings />;
    }
  };

  const handleMenuSelect = (section: string) => {
    setActiveSection(section);
  };
  
  const handleMobileBack = () => {
    setActiveSection(null); // Go back to the menu view on mobile
  };

  const sectionContent = renderSection();

  return (
    <SettingsLayout
      menu={<SettingsMenu onSelect={handleMenuSelect} />}
      showMenuOnMobile={!activeSection} // Only show menu if no section is active
      onMobileBack={handleMobileBack}
    >
      {sectionContent}
    </SettingsLayout>
  );
}
