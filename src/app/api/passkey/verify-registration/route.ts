// Schritt 4: Code zur Verifizierung der Registrierung hier einfügen
// Diese Route verifiziert die vom Browser signierte Registrierungs-Challenge.
// Bei Erfolg wird der neue Passkey in Firestore gespeichert und ein Firebase Custom Token erstellt.

import {NextRequest, NextResponse} from 'next/server';

export async function POST(request: NextRequest) {
  // Ihre Logik hier...
  return NextResponse.json({error: 'Noch nicht implementiert'}, {status: 501});
}
