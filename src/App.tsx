import { TranslationContextProvider } from '@/components/lang';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Theme, TonConnectUIProvider, UIPreferences } from '@tonconnect/ui-react';
import { ThemeProvider } from '@/components/theme';
import Header from './pages/header';
import MainPage from './pages/main';


function App() {
  const lang = localStorage.getItem('lang') as 'en' | 'ru';
  if (!lang || (lang !== 'en' && lang !== 'ru')) {
      localStorage.setItem('lang', 'en' as 'en' | 'ru');
  }
  const initialLocale: 'en' | 'ru' = localStorage.getItem('lang') as 'en' | 'ru';

  const normalizedTheme = localStorage.getItem('vite-ui-theme') ?
  (localStorage.getItem('vite-ui-theme') as any ).toUpperCase() as Theme : "SYSTEM";
  const uiPref = {
    theme: normalizedTheme
  } as UIPreferences;

  console.log("Инициализация App");
  
  // Манифест для TonConnect
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
  console.log("Манифест TonConnect URL:", manifestUrl);

  return (
    <>
      <TonConnectUIProvider 
        language={initialLocale} 
        manifestUrl={manifestUrl}
        uiPreferences={uiPref}
        actionsConfiguration={{
          // Важно указать настройки для тестовой сети
          skipRedirectToWallet: "never"
        }}
      >
        <TranslationContextProvider initialLocale={initialLocale}>
          <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                <div className="container">
                  <Header/>
                  <Router>
                    <Routes>
                      <Route path="/" element={<MainPage/>} />
                      <Route path="/flips" element={<MainPage/>} />
                    </Routes>
                  </Router>
                </div>
          </ThemeProvider>
        </TranslationContextProvider>
      </TonConnectUIProvider>
    </>
  )
}

export default App;
