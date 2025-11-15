import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ComoFazemos from './pages/ComoFazemos';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/como-fazemos" element={<ComoFazemos />} />
      </Routes>
    </Router>
  );
}

export default App;
