import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Login             from './pages/Login';
import Register          from './pages/Register';
import CharacterSelect   from './pages/CharacterSelect';
import CharacterSetup    from './pages/CharacterSetup';
import Dashboard         from './pages/Dashboard';
import WorldMap          from './pages/WorldMap';
import ForumList         from './pages/ForumList';
import PostDetail        from './pages/PostDetail';
import CreatePost        from './pages/CreatePost';
import CharacterProfile       from './pages/CharacterProfile';
import PublicCharacterProfile from './pages/PublicCharacterProfile';
import QuestBoard        from './pages/QuestBoard';
import AdminPanel        from './pages/AdminPanel';
import WorldAreas        from './pages/WorldAreas';
import AreaForum         from './pages/AreaForum';
import VenueForum        from './pages/VenueForum';
import Combat            from './pages/Combat';
import LoadingScreen     from './components/layout/LoadingScreen';

// Redirects based on full auth + character state
function SmartRedirect() {
  const { token, character, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!token)                            return <Navigate to="/login"            replace />;
  if (!character)                        return <Navigate to="/character-select" replace />;
  if (!character.isSetup)               return <Navigate to="/character-setup"  replace />;
  return <Navigate to="/dashboard" replace />;
}

// Only accessible when NOT logged in
function AuthRoute({ children }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (token) return <SmartRedirect />;
  return children;
}

// Requires login only
function ProtectedRoute({ children }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Requires login + character + isSetup
function DashboardRoute({ children }) {
  const { token, character, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!token)                  return <Navigate to="/login"            replace />;
  if (!character)              return <Navigate to="/character-select" replace />;
  if (!character.isSetup)     return <Navigate to="/character-setup"  replace />;
  return children;
}

// Requires login + character, but NOT yet setup
function SetupRoute({ children }) {
  const { token, character, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!token)                  return <Navigate to="/login"            replace />;
  if (!character)              return <Navigate to="/character-select" replace />;
  if (character.isSetup)      return <Navigate to="/dashboard"        replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                  element={<SmartRedirect />} />
          <Route path="/login"             element={<AuthRoute><Login /></AuthRoute>} />
          <Route path="/register"          element={<AuthRoute><Register /></AuthRoute>} />
          <Route path="/character-select"  element={<ProtectedRoute><CharacterSelect /></ProtectedRoute>} />
          <Route path="/character-setup"   element={<SetupRoute><CharacterSetup /></SetupRoute>} />
          <Route path="/dashboard"         element={<DashboardRoute><Dashboard /></DashboardRoute>} />
          <Route path="/map"               element={<DashboardRoute><WorldMap /></DashboardRoute>} />
          <Route path="/forum"             element={<DashboardRoute><ForumList /></DashboardRoute>} />
          <Route path="/forum/new"         element={<DashboardRoute><CreatePost /></DashboardRoute>} />
          <Route path="/forum/:id"         element={<DashboardRoute><PostDetail /></DashboardRoute>} />
          <Route path="/character"         element={<DashboardRoute><CharacterProfile /></DashboardRoute>} />
          <Route path="/character/:id"    element={<DashboardRoute><PublicCharacterProfile /></DashboardRoute>} />
          <Route path="/quests"            element={<DashboardRoute><QuestBoard /></DashboardRoute>} />
          <Route path="/admin"             element={<DashboardRoute><AdminPanel /></DashboardRoute>} />
          <Route path="/world/areas"       element={<DashboardRoute><WorldAreas /></DashboardRoute>} />
          <Route path="/world/areas/:id"   element={<DashboardRoute><AreaForum /></DashboardRoute>} />
          <Route path="/world/areas/:cityId/venue/:venueId" element={<DashboardRoute><VenueForum /></DashboardRoute>} />
          <Route path="/combat/:id"        element={<DashboardRoute><Combat /></DashboardRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
