'use client';

import { useState } from 'react';
import { useSearchParams }from 'next/navigation';
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

    const [mobileSection, setMobileSection] = useState<string | null>(null);

    const activeSection = isMobile ? mobileSection : (sectionParam || 'profile');

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
                return <ProfileSettings />;
        }
    };
    
    const handleMenuSelect = (section: string) => {
        if (isMobile) {
            setMobileSection(section);
        }
    };

    if (isMobile && activeSection && !searchParams.get('section')) {
        return (
            <SettingsLayout
                menu={<div />} // Menu is not shown on mobile detail view
                isMobileDetail={true}
                onMobileBack={() => setMobileSection(null)}
            >
                {renderSection()}
            </SettingsLayout>
        );
    }
    
    return (
        <SettingsLayout menu={<SettingsMenu onSelect={handleMenuSelect} />}>
            {renderSection()}
        </SettingsLayout>
    );
}
