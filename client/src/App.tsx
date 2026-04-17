import { Route, Switch, Redirect } from 'wouter';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Home        from '@/pages/Home';
import Login       from '@/pages/Login';
import Register    from '@/pages/Register';
import Docs        from '@/pages/Docs';
import Pricing     from '@/pages/Pricing';
import Dashboard   from '@/pages/Dashboard';
import AdminLayout from '@/pages/admin/AdminLayout';
import NotFound    from '@/pages/NotFound';

function PrivateRoute({ component: C, admin }: { component: React.ComponentType; admin?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-viper-dark flex items-center justify-center"><span className="text-viper-green font-mono text-sm animate-pulse">Authenticating...</span></div>;
  if (!user) return <Redirect to="/login" />;
  if (admin && !user.is_admin) return <Redirect to="/dashboard" />;
  return <C />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster theme="dark" position="top-right" richColors />
      <Switch>
        <Route path="/"          component={Home} />
        <Route path="/login"     component={Login} />
        <Route path="/register"  component={Register} />
        <Route path="/docs"      component={Docs} />
        <Route path="/docs/:cat" component={Docs} />
        <Route path="/pricing"   component={Pricing} />
        <Route path="/dashboard" component={() => <PrivateRoute component={Dashboard} />} />
        <Route path="/dashboard/:tab" component={() => <PrivateRoute component={Dashboard} />} />
        <Route path="/admin"     component={() => <PrivateRoute component={AdminLayout} admin />} />
        <Route path="/admin/:tab" component={() => <PrivateRoute component={AdminLayout} admin />} />
        <Route component={NotFound} />
      </Switch>
    </AuthProvider>
  );
}
