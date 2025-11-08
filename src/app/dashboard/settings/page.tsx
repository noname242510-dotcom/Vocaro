'use client';

import { useState, Suspense } from 'react';
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
  const section = searchParams.get('section') || 'profile';
  
  const [mobileActiveSection, setMobileActiveSection] = useState<string | null>(null);

  const handleMenuSelect = (selectedSection: string) => {
    setMobileActiveSection(selectedSection);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', selectedSection);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleMobileBack = () => {
    setMobileActiveSection(null);
    const params = new URLSearchParams(searchParams.toString());
    // We don't remove the section from the URL, so back/forward still works.
    // The view will just go back to the menu.
    router.replace(`${pathname}?${params.toString()}`);
  };

  const renderSection = () => {
    switch (section) {
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
        return <ProfileSettings />;
    }
  };
  
  return (
    <SettingsLayout
      menu={<SettingsMenu onSelect={handleMenuSelect} />}
      showMenuOnMobile={!mobileActiveSection} 
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
