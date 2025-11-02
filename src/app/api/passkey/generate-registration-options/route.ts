
import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { firestoreAdmin } from '@/lib/firebase-admin';

const RP_NAME = 'Vocaro';
const RP_ID = process.env.NODE_ENV === 'development' ? 'localhost' : (new URL(process.env.NEXT_PUBLIC_BASE_URL!)).hostname;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Benutzername fehlt' }, { status: 400 });
  }

  const email = `${username}@vocaro.app`;

  // Temporäre Benutzer-ID (könnte auch anders generiert werden)
  const userId = `user_${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: userId,
    userName: username,
    userDisplayName: username,
    attestationType: 'none',
    excludeCredentials: [], // Hier könnten bestehende Credentials ausgeschlossen werden, falls der Benutzer bereits welche hat
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });

  // Speichere die Challenge temporär, um sie später zu verifizieren.
  // Eine bessere Lösung für die Produktion wäre Redis oder ein kurzlebiges Firestore-Dokument.
  // Hier verwenden wir ein temporäres Dokument in einer Hilfs-Collection.
  const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(userId);
  await challengeRef.set({ 
    challenge: options.challenge,
    username: username,
    expires: Date.now() + 5 * 60 * 1000 // 5 Minuten Gültigkeit
  });


  return NextResponse.json(options);
}
