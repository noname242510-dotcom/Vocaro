export async function generateStaticParams() {
  return [{ groupId: 'default' }];
}

export default function Page({ params }: { params: Promise<{ groupId: string }> }) {
  return (
    <div>Group Page</div>
  );
}
