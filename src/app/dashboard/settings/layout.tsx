export default function SettingsPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="max-w-6xl mx-auto">{children}</div>;
}