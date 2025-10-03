import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { mockSettings } from "@/lib/data";

export default function SettingsPage() {
  const settings = mockSettings;

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold font-headline">Einstellungen</h1>
        <p className="text-muted-foreground">Passe dein Vocaro-Erlebnis an.</p>
      </div>

      <div className="flex justify-center">
        <div className="grid gap-8 max-w-2xl w-full">
          <Card>
            <CardHeader>
              <CardTitle>Quiz</CardTitle>
              <CardDescription>Verwalte deine Lern- und Wiederholungseinstellungen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="repetition-timeframe" className="flex flex-col space-y-1">
                  <span>Wiederholungszeitraum</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Falsch beantwortete Wörter aus diesem Zeitraum einbeziehen.
                  </span>
                </Label>
                <Select defaultValue={settings.quiz.repetitionTimeframe}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Zeitraum auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Letzte 24 Stunden</SelectItem>
                    <SelectItem value="7d">Letzte 7 Tage</SelectItem>
                    <SelectItem value="30d">Letzte 30 Tage</SelectItem>
                    <SelectItem value="all">Gesamte Zeit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="confetti-mode" className="flex flex-col space-y-1">
                  <span>Sieges-Konfetti</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Aktiviere eine Konfetti-Animation für hohe Punktzahlen.
                  </span>
                </Label>
                <Switch id="confetti-mode" defaultChecked={settings.quiz.enableConfetti} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Erscheinungsbild</CardTitle>
              <CardDescription>Passe an, wie Vocaro aussieht und sich anfühlt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="font-selection" className="flex flex-col space-y-1">
                  <span>Schriftart</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Wähle die primäre Schriftart für die Anwendung.
                  </span>
                </Label>
                <Select defaultValue={settings.appearance.font}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Schriftart auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-sans">PT Sans</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="source-code-pro">Source Code Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="theme" className="flex flex-col space-y-1">
                  <span>Thema</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Wähle zwischen hellem, dunklem oder System-Standardthema.
                  </span>
                </Label>
                <Select defaultValue={settings.appearance.theme}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Thema auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Hell</SelectItem>
                    <SelectItem value="dark">Dunkel</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
