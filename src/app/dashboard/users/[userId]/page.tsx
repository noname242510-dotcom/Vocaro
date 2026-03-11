'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, getDocs } from 'firebase/firestore';
import type { PublicProfile, Subject, Stack, Verb } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

function SimpleSubjectDisplay({ subject, ownerId }: { subject: Subject; ownerId: string; }) {
    const { firestore } = useFirebase();
    const [totalVocabCount, setTotalVocabCount] = useState(0);

    const stacksCollectionRef = useMemoFirebase(() => {
        if (!ownerId || !firestore) return null;
        return collection(firestore, 'users', ownerId, 'subjects', subject.id, 'stacks');
    }, [firestore, ownerId, subject.id]);

    const verbsCollectionRef = useMemoFirebase(() => {
        if (!ownerId || !firestore) return null;
        return collection(firestore, 'users', ownerId, 'subjects', subject.id, 'verbs');
    }, [firestore, ownerId, subject.id]);

    const { data: stacks } = useCollection<Stack>(stacksCollectionRef);
    const { data: verbs } = useCollection<Verb>(verbsCollectionRef);

    useEffect(() => {
        if (stacks && firestore && ownerId) {
            const fetchAllVocabCounts = async () => {
                let count = 0;
                for (const stack of stacks) {
                    const vocabCollectionRef = collection(firestore, 'users', ownerId, 'subjects', subject.id, 'stacks', stack.id, 'vocabulary');
                    const vocabSnapshot = await getDocs(vocabCollectionRef);
                    count += vocabSnapshot.size;
                }
                setTotalVocabCount(count);
            };
            fetchAllVocabCounts();
        } else if (stacks === null || stacks?.length === 0) {
            setTotalVocabCount(0);
        }
    }, [stacks, firestore, ownerId, subject.id]);

    return (
        <Card className="p-4">
            <div className="flex items-center gap-4">
                <span className="text-3xl">{subject.emoji}</span>
                <div className="flex-1">
                    <p className="font-semibold">{subject.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {totalVocabCount} Vokabeln · {verbs?.length ?? 0} Verben
                    </p>
                </div>
            </div>
        </Card>
    );
}


export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;
    const { firestore } = useFirebase();

    const publicProfileDocRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'publicProfiles', userId);
    }, [firestore, userId]);
    const { data: publicProfile, isLoading: isProfileLoading } = useDoc<PublicProfile>(publicProfileDocRef);

    const subjectsCollectionRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
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
                 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {subjects.map(subject => (
                        <SimpleSubjectDisplay 
                            key={subject.id} 
                            subject={subject} 
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
