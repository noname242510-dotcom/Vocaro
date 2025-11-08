'use client';

import { useState, Suspense } from 'react';
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

function SettingsComponent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');
  const isMobile = useIsMobile();
  
  // On mobile, if a section is in the URL, show it. Otherwise, show the menu.
  // On desktop, always show a section, defaulting to 'profile'.
  const [activeSection, setActiveSection] = useState<string | null>(
    isMobile ? (sectionParam || null) : (sectionParam || 'profile')
  );

  const renderSection = () => {
    const sectionToRender = isMobile ? activeSection : (sectionParam || 'profile');
    switch (sectionToRender) {
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
        // On mobile, if no section is active, we show the menu, so this case shouldn't be hit for content.
        // On desktop, default to profile.
        if (!isMobile) return <ProfileSettings />;
        return null;
    }
  };

  const handleMenuSelect = (section: string) => {
    setActiveSection(section);
    // Always update URL for consistent state, which is important for desktop and for mobile reloads.
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    router.replace(`${pathname}?${params.toString()}`);
  };
  
  const handleMobileBack = () => {
    setActiveSection(null);
    router.replace(pathname); // Go back to the base settings URL, showing the menu
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


export default function SettingsPage() {
    return (
        <Suspense fallback={<div>Laden...</div>}>
            <SettingsComponent />
        </Suspense>
    )
}
