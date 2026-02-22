import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div>
            <h1>Datenschutzerklärung</h1>
            <Alert variant="destructive" className="mt-4 mb-8">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Wichtiger Hinweis</AlertTitle>
                <AlertDescription>
                    Dies ist eine beispielhafte Datenschutzerklärung. Sie wurde zu Demonstrationszwecken im Rahmen einer App-Entwicklung erstellt und ist rechtlich nicht bindend. Die angegebenen Daten und Kontaktinformationen sind fiktiv.
                </AlertDescription>
            </Alert>
            <p>Stand: 24. Mai 2026</p>

            <h2>1. Einleitung</h2>
            <p>
                Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Diese Datenschutzerklärung informiert Sie darüber, wie wir, Vocaro, Ihre personenbezogenen Daten erheben, verarbeiten und nutzen, wenn Sie unsere Webanwendung nutzen.
            </p>

            <h2>2. Verantwortlicher</h2>
            <p>
                Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
                <br />
                Vocaro App
                <br />
                Musterstraße 1, 12345 Musterstadt
                <br />
                E-Mail: privacy@vocaro.app
            </p>

            <h2>3. Erhobene Daten</h2>
            <p>
                Wir erheben und verarbeiten folgende Daten:
            </p>
            <ul>
                <li><strong>Kontoinformationen:</strong> Bei der Registrierung erheben wir Ihren Benutzernamen und eine (anonymisierte) E-Mail-Adresse sowie Ihr Passwort (verschlüsselt). Ihr Profilbild ist für andere Nutzer sichtbar.</li>
                <li><strong>Nutzergenerierte Inhalte:</strong> Alle von Ihnen erstellten Fächer, Vokabelstapel, Vokabeln und Verblisten werden in unserer Datenbank gespeichert.</li>
                <li><strong>Nutzungsdaten:</strong> Wir speichern Ihren Lernfortschritt, einschliesslich richtiger und falscher Antworten, um die "Fehler-Fokus"-Funktion zu ermöglichen und Ihren Lernstand zu verfolgen.</li>
                <li><strong>Freundschaftsdaten:</strong> Wenn Sie die Freunde-Funktion nutzen, werden Ihr Benutzername und Ihr Profilbild für andere Nutzer in der Suche sichtbar. Ihre Fächer und aggregierte Statistiken (Anzahl der Vokabeln/Verben) sind für bestätigte Freunde sichtbar.</li>
                <li><strong>Technische Daten:</strong> Bei der Nutzung unserer App können technische Daten wie IP-Adresse, Browsertyp und Betriebssystem temporär verarbeitet werden, um die Funktionsfähigkeit sicherzustellen.</li>
            </ul>

            <h2>4. Zweck der Datenverarbeitung</h2>
            <p>
                Ihre Daten werden zu folgenden Zwecken verarbeitet:
            </p>
            <ul>
                <li>Zur Bereitstellung, Wartung und Verbesserung unserer Dienste.</li>
                <li>Zur Personalisierung Ihrer Lernerfahrung.</li>
                <li>Zur Ermöglichung sozialer Interaktionen innerhalb der App (Freunde-Funktion).</li>
                <li>Zur Gewährleistung der Sicherheit Ihres Kontos.</li>
                <li>Zur Analyse der App-Nutzung, um unseren Service zu optimieren.</li>
            </ul>

            <h2>5. Datensicherheit</h2>
            <p>
                Wir setzen auf Firebase von Google, einen Dienst, der hohe Sicherheitsstandards anwendet. Wir treffen technische und organisatorische Sicherheitsvorkehrungen, um Ihre Daten gegen Manipulation, Verlust oder unbefugten Zugriff zu schützen. Der Zugriff auf Profildaten anderer Nutzer ist auf bestätigte Freunde beschränkt.
            </p>
            
            <h2>6. Ihre Rechte</h2>
            <p>
                Sie haben das Recht auf Auskunft, Berichtigung, Löschung ("Recht auf Vergessenwerden"), Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch bezüglich Ihrer personenbezogenen Daten. Sie können Ihr Konto und alle damit verbundenen Daten jederzeit in den Einstellungen der Anwendung löschen.
            </p>

            <h2>7. Änderungen dieser Datenschutzerklärung</h2>
            <p>
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen. Die jeweils aktuelle Fassung finden Sie stets in unserer Anwendung.
            </p>
        </div>
    );
}
