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
import { TtsSettings } from './_components/tts-settings';

function SettingsComponent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const activeSection = searchParams.get('section');

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
      case 'appearance':
        return <AppearanceSettings />;
      case 'vocabulary':
        return <VocabSettings />;
      case 'verbs':
        return <VerbSettings />;
      case 'tts':
        return <TtsSettings />;
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
