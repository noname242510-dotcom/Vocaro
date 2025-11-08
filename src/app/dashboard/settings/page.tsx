'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
  
  // Directly get the section from URL. This is the single source of truth.
  const section = searchParams.get('section');
  const activeSection = section; // Can be null if not present

  const handleMenuSelect = (selectedSection: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', selectedSection);
    // On mobile, selecting a menu item should always show the content.
    // On desktop, it just updates the URL.
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleMobileBack = () => {
    // Go back to menu view by removing the 'section' param
    const params = new URLSearchParams(searchParams.toString());
    params.delete('section');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const renderSection = () => {
    switch (activeSection) {
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
      case 'profile':
      default:
        return <ProfileSettings />;
    }
  };
  
  return (
    <SettingsLayout
      menu={<SettingsMenu onSelect={handleMenuSelect} />}
      // On mobile, show the menu ONLY if there's no section in the URL.
      // Otherwise, show the content of the active section.
      showMenuOnMobile={!activeSection} 
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
