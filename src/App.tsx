// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CreateSession } from './components/CreateSession';
import { FileUpload } from './components/FileUpload';
import { DownloadPage } from './components/DownloadPage';
import MainPage from './components/MainPage';
import EncryptDecryptTest from './components/EncryptDecryptTest';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/create" element={<CreateSession />} />
        <Route path="/send/:sessionId" element={<FileUpload />} />
        <Route path="/download/:sessionId" element={<DownloadPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/test" element={<EncryptDecryptTest />} />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;