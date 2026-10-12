import { HashRouter, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from '../lib/config';
import { ThemeProvider } from '../lib/theme';
import { ToastProvider } from '../lib/toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Layout } from '../components/Layout';
import { HomePage } from './HomePage';
import { ToolPage } from './ToolPage';
import { PageTransition } from './PageTransition';

export function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <ConfigProvider>
        <ThemeProvider>
          <ToastProvider>
            <HashRouter>
              <Layout>
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/tool/:id" element={<ToolPage />} />
                    <Route path="*" element={<HomePage />} />
                  </Routes>
                </PageTransition>
              </Layout>
            </HashRouter>
          </ToastProvider>
        </ThemeProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}
