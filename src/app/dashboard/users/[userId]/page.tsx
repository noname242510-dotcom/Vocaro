export async function generateStaticParams() {
  return [{ userId: 'default' }];
}

export default function Page({ params }: { params: Promise<{ userId: string }> }) {
  return (
    <div>User Page</div>
  );
}
