import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { mockSettings } from "@/lib/data";

export default function SettingsPage() {
  const settings = mockSettings;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Customize your Vocaro experience.</p>
      </div>

      <div className="grid gap-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Quiz</CardTitle>
            <CardDescription>Manage your learning and repetition settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="repetition-timeframe" className="flex flex-col space-y-1">
                <span>Repetition Timeframe</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Include words you answered incorrectly within this period.
                </span>
              </Label>
              <Select defaultValue={settings.quiz.repetitionTimeframe}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="confetti-mode" className="flex flex-col space-y-1">
                <span>Victory Confetti</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Enable a confetti animation for high scores.
                </span>
              </Label>
              <Switch id="confetti-mode" defaultChecked={settings.quiz.enableConfetti} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how Vocaro looks and feels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="font-selection" className="flex flex-col space-y-1">
                <span>Font</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Choose the primary font for the application.
                </span>
              </Label>
              <Select defaultValue={settings.appearance.font}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select font" />
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
                <span>Theme</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Choose between light, dark, or system default theme.
                </span>
              </Label>
              <Select defaultValue={settings.appearance.theme}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
