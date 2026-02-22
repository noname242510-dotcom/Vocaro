// This file is intentionally left blank.
// The user has requested a public profile page for friends.
// This page will display a user's subjects and stats.
// Implementation will require fetching data specific to the user ID in the URL.

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc } from 'firebase/firestore';
import type { PublicProfile, Subject } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SubjectCard } from '../../_components/subject-card'; // Reusing the SubjectCard component

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;
    const { firestore, user: currentUser } = useFirebase();

    // Fetch public profile data
    const publicProfileDocRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'publicProfiles', userId);
    }, [firestore, userId]);
    const { data: publicProfile, isLoading: isProfileLoading } = useDoc<PublicProfile>(publicProfileDocRef);

    // Fetch user's subjects
    const subjectsCollectionRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        // This assumes security rules allow the current user to read this collection
        return collection(firestore, 'users', userId, 'subjects');
    }, [firestore, userId]);
    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollectionRef);
    
    const getInitials = (name: string | null | undefined) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };
    
    if (isProfileLoading || areSubjectsLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-muted-foreground" /></div>;
    }
    
    if (!publicProfile) {
        return (
            <div className="text-center mt-20">
                <h2 className="text-xl font-bold">Benutzer nicht gefunden</h2>
                <Button variant="link" onClick={() => router.back()}>Zurück</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={publicProfile.photoURL} />
                        <AvatarFallback className="text-2xl">{getInitials(publicProfile.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{publicProfile.displayName}</h1>
                        <p className="text-muted-foreground">Profil</p>
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4 font-headline">Fächer</h2>
            {subjects && subjects.length > 0 ? (
                 <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {subjects.map(subject => (
                        // Note: The onSubjectDeleted/Renamed props will not work for another user's profile
                        // This is acceptable for a read-only view.
                        <SubjectCard 
                            key={subject.id} 
                            subject={subject} 
                            onSubjectDeleted={() => {}}
                            onSubjectRenamed={() => {}}
                            ownerId={userId}
                        />
                    ))}
                 </div>
            ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-2xl">
                    <p className="text-muted-foreground">{publicProfile.displayName} hat noch keine Fächer erstellt.</p>
                </div>
            )}
        </div>
    );
}
