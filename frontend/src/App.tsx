import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/landing/HeroSection';
import { QuickTestBench } from './components/landing/QuickTestBench';
import { FeatureCards } from './components/landing/FeatureCards';
import { AuthModal } from './components/auth/AuthModal';
import { KeyStudioView } from './components/keys/KeyStudioView';
import { PolicyStudioView } from './components/policies/PolicyStudioView';

const MainContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'policies' | 'keys'>('landing');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [targetViewAfterAuth, setTargetViewAfterAuth] = useState<'landing' | 'policies' | 'keys'>('landing');

  const handleNavigate = (view: 'landing' | 'policies' | 'keys') => {
    if ((view === 'policies' || view === 'keys') && !isAuthenticated) {
      setTargetViewAfterAuth(view);
      setAuthInitialTab('login');
      setAuthModalOpen(true);
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthInitialTab(tab);
    setTargetViewAfterAuth('landing');
    setAuthModalOpen(true);
  };

  const handleScrollToTest = () => {
    if (currentView !== 'landing') {
      setCurrentView('landing');
      setTimeout(() => {
        document.getElementById('quick-test-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('quick-test-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-[#e5e1e4]">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {currentView === 'landing' && (
          <>
            <HeroSection
              onScrollToTest={handleScrollToTest}
              onNavigateKeys={() => handleNavigate('keys')}
              onOpenAuth={() => handleOpenAuth('login')}
            />
            <QuickTestBench onOpenAuth={handleOpenAuth} />
            <FeatureCards />
          </>
        )}

        {currentView === 'keys' && <KeyStudioView />}

        {currentView === 'policies' && <PolicyStudioView />}
      </main>

      {/* Footer */}
      <Footer />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authInitialTab}
        onClose={() => setAuthModalOpen(false)}
        onSuccessRedirect={() => {
          setCurrentView(targetViewAfterAuth);
        }}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;
