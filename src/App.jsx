import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import SuperUserDashboard from './pages/SuperUserDashboard';

import SecretariaUserDashboard from './pages/SecretariaUserDashboard';
import DirectorDashboard from './pages/DirectorDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<SuperUserDashboard />} />
        {}
        <Route path="/secretaria-dashboard" element={<SecretariaUserDashboard />} />
        <Route path="/director-dashboard" element={<DirectorDashboard />} />
      </Routes>
    </Router>
  );
  
}

export default App;