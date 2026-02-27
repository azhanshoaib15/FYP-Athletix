import Dashboard from '@/components/Frontend/Dashboard';
import Display from '@/components/Frontend/Display';
import GenderSelectionScreen from '@/components/Frontend/GenderSelectionScreen';
import SignIn from '@/components/Frontend/SignIn';
import SignUp from '@/components/Frontend/SignUp';
import { useState } from 'react';

export default function HomeScreen() {
  const [currentView, setCurrentView] = useState<'display' | 'signin' | 'signup' | 'dashboard' | 'gender'>('display');

  if (currentView === 'signin') {
    return <SignIn onNavigate={setCurrentView} />;
  }

  if (currentView === 'signup') {
    return <SignUp onNavigate={setCurrentView} />;
  }

  if (currentView === 'gender') {
    return <GenderSelectionScreen onNavigate={setCurrentView} />;
  }

  if (currentView === 'dashboard') {
    return <Dashboard onNavigate={setCurrentView} />;
  }

  return <Display onNavigate={setCurrentView} />;
}
