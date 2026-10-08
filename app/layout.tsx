import type { Metadata } from 'next';
import './globals.css';
import AccessGate from '@/components/AccessGate';

export const metadata: Metadata = {
  title: 'Relalia: O Relatório da Alia',
  description: 'Linha do tempo das validações do VadeChat, Atlas e Base de Conhecimento, com relatórios, achados e evidências.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><AccessGate>{children}</AccessGate></body></html>;
}
