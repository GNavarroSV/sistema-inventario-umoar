import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'Sistema de Inventario',
    description: 'Inventario universitario con autenticacion y menus por rol.',
};

interface RootLayoutProps {
    children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="es">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}