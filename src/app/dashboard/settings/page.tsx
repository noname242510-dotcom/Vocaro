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
  
  // On mobile, we need a local state to track the active view (menu or section)
  // On desktop, the URL is the source of truth.
  const [mobileActiveSection, setMobileActiveSection] = useState<string | null>(null);

  // When the section parameter changes in the URL (e.g., browser back/forward), update mobile view.
  // This is safer than the previous implementation.
  useState(() => {
     setMobileActiveSection(sectionParam);
  });

  const handleMenuSelect = (section: string) => {
    // On mobile, we change the local state to show the section component
    if (isMobile) {
      setMobileActiveSection(section);
    }
    // Always update the URL for consistency and desktop navigation
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    router.replace(`${pathname}?${params.toString()}`);
  };
  
  const handleMobileBack = () => {
    setMobileActiveSection(null);
  };

  const renderSection = () => {
    // Determine which section to render.
    // On mobile, it's what the user has clicked.
    // On desktop, it's what the URL says. Default to 'profile'.
    const sectionToRender = isMobile ? mobileActiveSection : (sectionParam || 'profile');
    
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
        // On desktop, if param is invalid, default to profile.
        if (!isMobile) return <ProfileSettings />;
        // On mobile, this will result in the menu being shown (showMenuOnMobile = true).
        return null;
    }
  };
  
  // On mobile, show the menu if no section has been selected yet.
  const showMenuOnMobile = isMobile && !mobileActiveSection;

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
