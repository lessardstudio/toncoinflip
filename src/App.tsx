import { TranslationContextProvider } from '@/components/lang';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Theme, TonConnectUIProvider, UIPreferences } from '@tonconnect/ui-react';
import MainPage from './pages/main';
import { ThemeProvider, ThemeType } from '@/components/theme';
import Header from './pages/header';



function App() {
  const lang = localStorage.getItem('lang') as 'en' | 'ru';
  if (!lang || (lang !== 'en' && lang !== 'ru')) {
      localStorage.setItem('lang', 'en' as 'en' | 'ru');
  }
  const initialLocale: 'en' | 'ru' = localStorage.getItem('lang') as 'en' | 'ru';

  const uiPref = {
    theme: (localStorage.getItem('vite-ui-theme') as string).toUpperCase() as Theme
  } as UIPreferences;



  return (
    <>
      <TonConnectUIProvider language={initialLocale} manifestUrl={window.location.origin+"/tonconnect-manifest.json"}
        uiPreferences={uiPref}>
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