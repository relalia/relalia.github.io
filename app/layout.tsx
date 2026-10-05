import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Histórico de validação · Tri7 Alia',
  description: 'Linha do tempo pública e revisada das validações do VadeChat e Atlas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
