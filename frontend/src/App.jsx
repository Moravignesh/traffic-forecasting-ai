import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Header  from "./components/layout/Header";
import Dashboard    from "./pages/Dashboard";
import Forecast     from "./pages/Forecast";
import Anomalies    from "./pages/Anomalies";
import Simulation   from "./pages/Simulation";
import Optimization from "./pages/Optimization";
import Analytics    from "./pages/Analytics";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
            <Routes>
              <Route path="/"            element={<Dashboard />}    />
              <Route path="/forecast"    element={<Forecast />}     />
              <Route path="/anomalies"   element={<Anomalies />}    />
              <Route path="/simulation"  element={<Simulation />}   />
              <Route path="/optimization"element={<Optimization />} />
              <Route path="/analytics"   element={<Analytics />}    />
              <Route path="*"            element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
