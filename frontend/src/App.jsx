import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Games from './pages/Games.jsx';
import Wallet from './pages/Wallet.jsx';
import Promotions from './pages/Promotions.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import PlayGame from './pages/PlayGame.jsx';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="/play/:id" element={<PlayGame />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
