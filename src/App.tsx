import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import KnowledgeBase from './pages/KnowledgeBase';
import Login from './pages/Login';
import { useAuthStore } from './store/authStore';
import { supabase } from './lib/supabase';

function App() {
  const { isAuthenticated, setUser, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.email?.endsWith('@forwardassisthq.com');
  
  // Check for existing user session on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name,
          });
        }
        
        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.name,
              });
            } else {
              setUser(null);
            }
          }
        );
        
        setLoading(false);
        
        // Cleanup subscription
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth check failed:', error);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [setUser]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A2463] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Forward Assist HQ...</p>
        </div>
      </div>
    );
  }
  
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <Chat /> : <Navigate to="/login" />}
        />
        <Route
          path="/documents"
          element={isAuthenticated ? <Documents /> : <Navigate to="/login" />}
        />
        <Route
          path="/knowledge-base"
          element={
            isAuthenticated && isAdmin ? (
              <KnowledgeBase />
            ) : (
              <Navigate to={isAuthenticated ? "/" : "/login"} />
            )
          }
        />
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;