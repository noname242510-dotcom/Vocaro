import ClientPage from './ClientPage';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function Page() {
  return <ClientPage />;
}
