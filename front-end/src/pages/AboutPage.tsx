import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { checkAuth } from '@/lib/api';

const AboutPage = () => {
  const isLoggedIn = checkAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={isLoggedIn} />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl space-y-8 text-center">
          <h1 className="text-4xl font-bold">About</h1>
          <p className="text-lg text-muted-foreground">Content coming soon...</p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
