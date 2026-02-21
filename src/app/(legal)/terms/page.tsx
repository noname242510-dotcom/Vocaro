import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function TermsPage() {
  return (
      <div>
          <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
          <Alert variant="destructive" className="mt-4 mb-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Wichtiger Hinweis</AlertTitle>
              <AlertDescription>
                  Dies sind beispielhafte AGBs. Sie wurden zu Demonstrationszwecken im Rahmen einer App-Entwicklung erstellt und sind rechtlich nicht bindend.
              </AlertDescription>
          </Alert>
          <p>Stand: 24. Mai 2026</p>

          <h2>1. Geltungsbereich</h2>
          <p>
              Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Webanwendung "Vocaro" (nachfolgend "App"). Mit der Registrierung und Nutzung der App stimmen Sie diesen Bedingungen zu.
          </p>

          <h2>2. Leistungen</h2>
          <p>
              Vocaro bietet eine Plattform zum Erstellen, Verwalten und Lernen von Vokabeln und Verben. Die Nutzung der Grundfunktionen ist kostenlos. Wir behalten uns vor, zukünftig Premium-Funktionen gegen eine Gebühr anzubieten.
          </p>

          <h2>3. Registrierung und Nutzerkonto</h2>
          <p>
              Die Nutzung der App erfordert die Erstellung eines Nutzerkontos. Sie sind dafür verantwortlich, die Vertraulichkeit Ihrer Zugangsdaten zu wahren. Sie dürfen Ihr Konto nicht an Dritte weitergeben.
          </p>

          <h2>4. Nutzergenerierte Inhalte</h2>
          <p>
              Sie sind allein für die von Ihnen in die App eingegebenen Inhalte (Vokabeln, Notizen etc.) verantwortlich. Sie dürfen keine Inhalte hochladen, die illegal sind, gegen Rechte Dritter verstossen oder anderweitig anstössig sind. Wir behalten uns das Recht vor, solche Inhalte ohne Vorwarnung zu entfernen.
          </p>

          <h2>5. Haftungsbeschränkung</h2>
          <p>
              Wir bemühen uns, die App ständig verfügbar zu halten, können jedoch keine ununterbrochene Verfügbarkeit garantieren. Wir haften nicht für Datenverluste oder für Schäden, die durch die Nutzung oder Nichtverfügbarkeit der App entstehen, es sei denn, diese beruhen auf Vorsatz oder grober Fahrlässigkeit.
          </p>

          <h2>6. Kündigung und Kontolöschung</h2>
          <p>
              Sie können Ihr Konto jederzeit und ohne Angabe von Gründen über die Einstellungen in der App löschen. Mit der Löschung werden alle Ihre Daten unwiderruflich entfernt. Wir behalten uns das Recht vor, inaktive Konten oder Konten, die gegen diese AGB verstossen, zu sperren oder zu löschen.
          </p>

          <h2>7. Änderungen der AGB</h2>
          <p>
              Wir können diese AGB von Zeit zu Zeit anpassen. Über wesentliche Änderungen werden wir Sie informieren. Wenn Sie die App nach einer Änderung weiter nutzen, stimmen Sie den neuen Bedingungen zu.
          </p>

          <h2>8. Schlussbestimmungen</h2>
          <p>
              Sollte eine Bestimmung dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
          </p>
      </div>
  );
}
