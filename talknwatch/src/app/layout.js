import { Inter, Poppins, Roboto } from "next/font/google";
import "./globals.css";

// Load your preferred font
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

// Or keep using Inter if you prefer
// const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TalkNWatch - Watch Videos Together',
  description: 'Synchronize video playback with friends in real-time',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        {children}
      </body>
    </html>
  );
}