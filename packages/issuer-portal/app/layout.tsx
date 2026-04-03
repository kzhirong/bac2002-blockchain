import './globals.css';

export const metadata = {
  title: 'KYC Portal',
  description: 'Decentralised Identity — KYC Credential Issuance',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
