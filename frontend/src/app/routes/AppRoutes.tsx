import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from '../../pages/home/HomePage';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;


