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
  
  // This state now only controls the view on mobile.
  // It is derived from the URL search param. A null value means the menu is shown.
  const mobileActiveSection = searchParams.get('section');


  const handleMenuSelect = (selectedSection: string) => {
    // Show the detail view on mobile by updating the URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', selectedSection);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleMobileBack = () => {
    // Go back to the menu view on mobile by removing the 'section' param
    const params = new URLSearchParams(searchParams.toString());
    params.delete('section');
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
