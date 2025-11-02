// Schritt 4: Code für die Registrierungs-Challenge hier einfügen
// Diese Route generiert die Challenge für einen neuen Benutzer.
// Sie benötigt den `username` als Query-Parameter.

import {NextRequest, NextResponse} from 'next/server';

export async function GET(request: NextRequest) {
  const {searchParams} = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({error: 'Benutzername fehlt'}, {status: 400});
  }

  // Ihre Logik hier...
  return NextResponse.json({error: 'Noch nicht implementiert'}, {status: 501});
}
