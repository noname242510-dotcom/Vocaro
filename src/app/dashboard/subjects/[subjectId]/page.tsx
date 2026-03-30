export async function generateStaticParams() {
  return [{ subjectId: 'default' }];
}

export default function Page({ params }: { params: Promise<{ subjectId: string }> }) {
  return (
    <div>Subject Page</div>
  );
}
