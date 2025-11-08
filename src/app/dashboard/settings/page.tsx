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
  
  const [activeSection, setActiveSection] = useState<string | null>(sectionParam);

  const handleMenuSelect = (section: string) => {
    setActiveSection(section);
    // For mobile, the layout will change. For desktop, we update the URL.
    if (!isMobile) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', section);
      router.replace(`${pathname}?${params.toString()}`);
    }
  };
  
  const handleMobileBack = () => {
    setActiveSection(null);
  };

  const renderSection = () => {
    // On desktop, the active section is controlled by URL param.
    // On mobile, it's controlled by local state 'activeSection'.
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
        // On desktop, default to profile if param is invalid
        if (!isMobile) return <ProfileSettings />;
        // On mobile, this will result in the menu being shown, which is correct.
        return null;
    }
  };
  
  // On mobile, if a section is selected, we are in a 'detail' view.
  const showMenuOnMobile = isMobile && !activeSection;

  return (
    <SettingsLayout
      menu={<SettingsMenu onSelect={handleMenuSelect} />}
      showMenuOnMobile={showMenuOnMobile} 
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
