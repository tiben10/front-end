import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import SuperUserDashboard from './pages/SuperUserDashboard';
//import DirectorUserDashboard from './pages/DirectorUserDashboard';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<SuperUserDashboard />} />
        {/* <Route path="/director-dashboard" element={<DirectorUserDashboard />} /> */}
      </Routes>
    </Router>
  );
  
}

export default App;