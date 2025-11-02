// Schritt 5: Code für die Anmelde-Challenge hier einfügen
// Diese Route generiert die Challenge für einen bestehenden Benutzer.
// Sie muss die gespeicherten Passkeys des Benutzers aus Firestore laden.

import {NextRequest, NextResponse} from 'next/server';

export async function GET(request: NextRequest) {
  // Ihre Logik hier...
  return NextResponse.json({error: 'Noch nicht implementiert'}, {status: 501});
}
