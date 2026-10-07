import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Relalia: O Relatório da Alia',
  description: 'Linha do tempo das validações do VadeChat, Atlas e Base de Conhecimento, com relatórios, achados e evidências.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
