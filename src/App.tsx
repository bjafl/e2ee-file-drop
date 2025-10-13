// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CreateSession } from './components/CreateSession';
import { FileUpload } from './components/FileUpload';
import { DownloadPage } from './components/DownloadPage';
import MainPage from './components/MainPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/create" element={<CreateSession />} />
        <Route path="/send/:sessionId" element={<FileUpload />} />
        <Route path="/download/:sessionId" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;