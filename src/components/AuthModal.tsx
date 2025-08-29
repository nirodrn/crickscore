import React, { useState } from 'react';
import { firebaseService } from '../firebase';
import { User, Mail, Lock, UserPlus } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onAuth: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Please fill in all fields');
      }

      if (!isLogin) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
      }

      let user;
      if (isLogin) {
        user = await firebaseService.signInWithEmail(email, password);
      } else {
        user = await firebaseService.signUpWithEmail(email, password);
      }
      
      console.log('Authentication successful:', user);
      onAuth(user);
      onClose();
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to access your matches' : 'Create an account to save your matches'}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email address"
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Password"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLogin ? <Mail className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            <span>{loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};