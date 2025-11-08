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
  
  // Directly get the section from URL, default to 'profile'. This is the single source of truth.
  const section = searchParams.get('section');
  const activeSection = section || 'profile';

  const handleMenuSelect = (selectedSection: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', selectedSection);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleMobileBack = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('section');
    router.replace(`${pathname}?${params.toString()}`);
  };

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
        // Fallback to profile section if the URL param is invalid
        return <ProfileSettings />;
    }
  };
  
  return (
    <SettingsLayout
      menu={<SettingsMenu onSelect={handleMenuSelect} />}
      // On mobile, the menu is shown only if there is NO section parameter in the URL.
      showMenuOnMobile={!section} 
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
