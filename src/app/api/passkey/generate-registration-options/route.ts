
import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';

const RP_NAME = 'Vocaro';
const RP_ID = 'vocaro-vocab.vercel.app';
const ORIGIN = `https://${RP_ID}`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Benutzername fehlt.' }, { status: 400 });
  }

  const email = `${username}@vocaro.app`;

  // Prüfen, ob der Benutzer bereits existiert
  let userRecord;
  try {
    userRecord = await authAdmin.getUserByEmail(email);
  } catch (error: any) {
    if (error.code !== 'auth/user-not-found') {
      throw error; // Andere Fehler weiterwerfen
    }
  }

  // Benutzer-ID für die Challenge
  const userId = userRecord ? userRecord.uid : `temp_user_${Date.now()}`;

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: userId,
    userName: username,
    userDisplayName: username,
    attestationType: 'none',
    excludeCredentials: [], 
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });

  // Speichere die Challenge temporär, um sie später zu verifizieren.
  const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(userId);
  await challengeRef.set({ 
    challenge: options.challenge,
    username: username,
    expires: Date.now() + 5 * 60 * 1000 // 5 Minuten Gültigkeit
  });

  return NextResponse.json(options);
}
