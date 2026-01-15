import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Mail,
  FileSpreadsheet,
  Plus,
  Trash2,
  Save,
  Upload,
  CheckCircle,
  AlertCircle,
  LogOut,
  Play,
  Download,
  Users,
  FileText,
  Loader2,
  Lock,
  Shield,
  Calendar,
  Edit,
  X,
  Building,
  MapPin,
  User as UserIcon,
  ChevronLeft,
  Settings,
  ArrowRight,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Globe,
  Copy,
  RefreshCw,
  BarChart3,
  History,
  Activity,
  TrendingUp,
  Layers,
  Clock
} from 'lucide-react';

// --- Types ---

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface Sender {
  email: string;
  password?: string;
}

interface Receiver {
  receiverMail: string;
  receiverDomain: string;
  receiverName: string;
  scheduledDateTime: string;
}

interface User {
  _id: string;
  email: string;
  company_name?: string;
  location?: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  allowed_apis: string[];
  access_days: number | null;
  monthly_email_limit?: number;
  access_expires_at: string | null;
  created_at: string;
}

interface UserUsage {
  user_id: string;
  email: string;
  monthly_email_limit: number;
  sent_this_month: number;
  remaining: number | null;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
}

interface DomainVerificationResponse {
  domain: string;
  status: 'verification_required' | 'verified' | 'pending';
  message?: string;
  dns_records?: {
    txt: DNSRecord;
    dkim: DNSRecord[];
  };
}

interface DomainListItem {
  domain: string;
  status: 'verified' | 'pending' | 'verification_required';
  provider?: string;
  created_at?: string;
  verified_at?: string | null;
}

interface EmailStats {
  monthly_limit: number;
  sent_today: number;
  sent_this_month: number;
  remaining: number | null;
}

interface EmailLog {
  _id: string;
  job_id: string;
  senderMail: string;
  receiverMail: string;
  status: 'scheduled' | 'sent' | 'failed';
  scheduled_at: string;
  executed_at: string | null;
  error: string | null;
  created_at: string;
}

interface MasterScheduleSummary {
  message: string;
  summary: {
    total_rows: number;
    scheduled: number;
    failed: number;
  };
  scheduled_jobs: Array<{
    row: number;
    senderMail: string;
    receiverMail: string;
    scheduledDateTime: string;
  }>;
  errors: Array<{
    row: number;
    senderMail: string;
    error: string;
  }>;
}

interface AutoScheduleSummary {
  message: string;
  startDateTime: string;
  gapMinutes: number;
  scheduled: number;
  failed: number;
  errors: Array<{
    row?: number;
    email?: string;
    error: string;
  }>;
}

// --- Constants ---
const BASE_URL = "https://thetechdrops.duckdns.org";

// --- API Helper ---
const apiCall = async (endpoint: string, { suppressLog, ...options }: RequestInit & { suppressLog?: boolean } = {}) => {
  try {
    const url = `${BASE_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...((options.headers as any) || {})
    };

    const res = await fetch(url, {
      ...options,
      headers,
      mode: 'cors'
    });

    let data;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const errorMessage =
        (typeof data === 'object' && data?.error) ||
        (typeof data === 'object' && data?.message) ||
        (typeof data === 'string' && data) ||
        `Server Error: ${res.status} ${res.statusText}`;
      
      throw new Error(errorMessage as string);
    }

    return data;
  } catch (err: any) {
    if (!suppressLog) console.error("API Fetch Error:", err);
    if (err.message === "Failed to fetch" || err.name === "TypeError") {
      throw new Error("Network Error: Could not connect to server. Check your internet connection or possible CORS issues.");
    }
    throw err;
  }
};

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

// --- Components ---

// 1. Auth Component
const AuthScreen = ({ onLogin }: { onLogin: (token: string, isAdmin: boolean) => void }) => {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [signupData, setSignupData] = useState({
    email: '', otp: '', name: '', company_name: '', location: '', password: ''
  });
  const [signupSuccess, setSignupSuccess] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      const data = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.error === "Admin approval required") throw new Error("Your account is pending admin approval.");
      const token = data.access_token;
      try {
        await apiCall('/admin/users', { headers: { 'Authorization': `Bearer ${token}` }, suppressLog: true });
        onLogin(token, true);
      } catch {
        onLogin(token, false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      await apiCall('/signup', {
        method: 'POST',
        body: JSON.stringify({ email: signupData.email })
      });
      setSignupStep(2);
      setSignupSuccess(`OTP sent to ${signupData.email}`);
      setTimeout(() => setSignupSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      await apiCall('/verify-signup-otp', {
        method: 'POST',
        body: JSON.stringify(signupData)
      });
      setSignupSuccess("Signup successful! Waiting for admin approval.");
      setTimeout(() => {
        setView('login'); setSignupSuccess(''); setError(''); setSignupStep(1);
        setSignupData({ email: '', otp: '', name: '', company_name: '', location: '', password: '' });
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/50 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-blue-500 rounded-b-full blur-[2px] opacity-70"></div>
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20">
            {view === 'login' ? <Lock className="w-8 h-8 text-white" /> : <UserIcon className="w-8 h-8 text-white" />}
          </div>
        </div>
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            {view === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400 text-sm">{view === 'login' ? 'Sign in to TechDrops Automator' : 'Join TechDrops Automation'}</p>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        {signupSuccess && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg mb-6 text-sm text-center flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{signupSuccess}</div>}

        {view === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600" placeholder="user@example.com" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600" placeholder="•••••" required />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setView('signup')} className="text-sm text-slate-400 hover:text-white transition-colors">Don't have an account? <span className="text-blue-400 font-semibold">Sign Up</span></button>
            </div>
          </form>
        ) : (
          <div>
            {signupStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                 <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Work Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input type="email" value={signupData.email} onChange={(e) => setSignupData({...signupData, email: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600" placeholder="user@company.com" required />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ArrowRight className="w-4 h-4" /></>}</button>
              </form>
            ) : (
              <form onSubmit={handleCompleteSignup} className="space-y-4">
                 <div className="flex gap-2">
                    <input disabled value={signupData.email} className="w-1/2 bg-slate-800/50 border border-slate-700 text-slate-400 rounded-lg px-3 py-2 text-sm cursor-not-allowed" />
                    <input placeholder="Enter OTP" value={signupData.otp} onChange={e => setSignupData({...signupData, otp: e.target.value})} className="w-1/2 bg-slate-900 border border-blue-500/50 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-center tracking-widest font-mono" required />
                 </div>
                 <div className="relative group"><UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input placeholder="Full Name" value={signupData.name} onChange={e => setSignupData({...signupData, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg py-2 pl-9 pr-3 focus:border-blue-500 outline-none text-sm" required /></div>
                 <div className="flex flex-col sm:flex-row gap-2">
                   <div className="relative group w-full sm:w-1/2"><Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input placeholder="Company" value={signupData.company_name} onChange={e => setSignupData({...signupData, company_name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg py-2 pl-9 pr-3 focus:border-blue-500 outline-none text-sm" required /></div>
                   <div className="relative group w-full sm:w-1/2"><MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input placeholder="Location" value={signupData.location} onChange={e => setSignupData({...signupData, location: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg py-2 pl-9 pr-3 focus:border-blue-500 outline-none text-sm" required /></div>
                 </div>
                 <div className="relative group"><Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input type="password" placeholder="Set Password" value={signupData.password} onChange={e => setSignupData({...signupData, password: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg py-2 pl-9 pr-3 focus:border-blue-500 outline-none text-sm" required /></div>
                 <button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2">{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Signup"}</button>
              </form>
            )}
            <div className="text-center mt-4">
              <button type="button" onClick={() => { if (signupStep === 2) { setSignupStep(1); setSignupSuccess(''); setError(''); } else { setView('login'); } }} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"><ChevronLeft className="w-4 h-4" /> {signupStep === 2 ? 'Change Email' : 'Back to Login'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Admin Dashboard
const AdminDashboard = ({ token, onLogout }: { token: string, onLogout: () => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [usage, setUsage] = useState<UserUsage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [formData, setFormData] = useState({
    status: 'approved',
    access_days: 30,
    monthly_email_limit: 500,
    allowed_apis: ['scheduleEmails', 'extractEmails', 'domainVerification', 'autoScheduleEmails']
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiCall('/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
      setUsers(data);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const fetchUsage = async () => {
    try {
      const data = await apiCall('/admin/email-usage', { headers: { 'Authorization': `Bearer ${token}` } });
      setUsage(data.users || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    fetchUsers(); 
    fetchUsage();
  }, []);

  const handleEditClick = (user: User) => {
    const userUsage = usage.find(u => u.user_id === user._id);
    setEditingUser(user);
    setFormData({
      status: user.status === 'pending' ? 'approved' : user.status,
      access_days: user.access_days || 30,
      monthly_email_limit: user.monthly_email_limit || userUsage?.monthly_email_limit || 500,
      allowed_apis: user.allowed_apis.length > 0 ? user.allowed_apis : ['scheduleEmails', 'extractEmails','domainVerification', 'autoScheduleEmails']
    });
    setMsg(null);
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    setMsg(null);
    try {
      // API call to update user access and status
      await apiCall('/admin/update-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: editingUser.email,
          status: formData.status,
          allowed_apis: formData.allowed_apis,
          monthly_email_limit: Number(formData.monthly_email_limit),
          access_days: Number(formData.access_days)
        })
      });

      setMsg({ type: 'success', text: "User updated successfully!" });
      fetchUsers();
      fetchUsage();
      setTimeout(() => setEditingUser(null), 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const toggleApi = (api: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_apis: prev.allowed_apis.includes(api)
        ? prev.allowed_apis.filter(a => a !== api)
        : [...prev.allowed_apis, api]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <Shield className="w-6 h-6 text-purple-500" /> Admin Dashboard
            </h1>
            <p className="text-slate-400">Manage user access and API permissions.</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"><LogOut className="w-4 h-4" /> Logout</button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 whitespace-nowrap">
              <thead className="bg-slate-800 text-slate-200 uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Usage (Sent/Limit)</th>
                  <th className="px-6 py-4">Remaining</th>
                  <th className="px-6 py-4">Expires At</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>
                ) : users.map(user => {
                  const userUsage = usage.find(u => u.user_id === user._id);
                  return (
                    <tr key={user._id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{user.email}</div>
                        <div className="text-xs">{user.company_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          user.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          user.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <div className="text-white font-mono">{userUsage?.sent_this_month || 0} / {userUsage?.monthly_email_limit || user.monthly_email_limit || 0}</div>
                           <div className="w-24 bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                              <div 
                                className="bg-blue-500 h-full" 
                                style={{ width: `${Math.min(((userUsage?.sent_this_month || 0) / (userUsage?.monthly_email_limit || user.monthly_email_limit || 1)) * 100, 100)}%` }}
                              />
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${userUsage?.remaining === 0 ? 'text-red-400' : 'text-slate-300'}`}>
                          {userUsage?.remaining === null ? 'Unlimited' : userUsage?.remaining}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {user.access_expires_at ? new Date(user.access_expires_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleEditClick(user)} className="p-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Update Permissions</h3>
              <button onClick={() => setEditingUser(null)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-1">User Email</label>
                <input disabled value={editingUser.email} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Access Duration (Days)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="number"
                      value={formData.access_days}
                      onChange={(e) => setFormData({...formData, access_days: parseInt(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white focus:border-blue-500 outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Monthly Email Limit</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="number"
                      value={formData.monthly_email_limit}
                      onChange={(e) => setFormData({...formData, monthly_email_limit: parseInt(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white focus:border-blue-500 outline-none" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Account Status</label>
                <div className="flex flex-wrap gap-4">
                  {['approved', 'rejected', 'pending'].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        checked={formData.status === s}
                        onChange={() => setFormData({...formData, status: s})}
                        className="accent-blue-500" 
                      />
                      <span className="capitalize text-slate-300">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Allowed APIs</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox"
                      checked={formData.allowed_apis.includes('scheduleEmails')}
                      onChange={() => toggleApi('scheduleEmails')}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <div>
                      <div className="text-white font-medium">Schedule Emails</div>
                      <div className="text-xs text-slate-500">Allows bulk email campaigns</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox"
                      checked={formData.allowed_apis.includes('autoScheduleEmails')}
                      onChange={() => toggleApi('autoScheduleEmails')}
                      className="w-4 h-4 accent-indigo-500"
                    />
                    <div>
                      <div className="text-white font-medium">Auto Schedule Emails</div>
                      <div className="text-xs text-slate-500">Allows drip campaigns with time gaps</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox"
                      checked={formData.allowed_apis.includes('extractEmails')}
                      onChange={() => toggleApi('extractEmails')}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <div>
                      <div className="text-white font-medium">Extract Emails</div>
                      <div className="text-xs text-slate-500">Allows scraping domains</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800">
                    <input 
                      type="checkbox"
                      checked={formData.allowed_apis.includes('domainVerification')}
                      onChange={() => toggleApi('domainVerification')}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <div>
                      <div className="text-white font-medium">Domain Verification</div>
                      <div className="text-xs text-slate-500">Allows verifying custom domains</div>
                    </div>
                  </label>
                </div>
              </div>

              {msg && (
                <div className={`p-3 rounded-lg text-sm text-center ${msg.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {msg.text}
                </div>
              )}

              <button 
                onClick={handleUpdate}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. User Dashboard Layout
const UserDashboard = ({ token, onLogout }: { token: string, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'auto' | 'master' | 'domains' | 'extract'>('overview');
  const [health, setHealth] = useState<{status: string, scheduler_running: boolean} | null>(null);
  
  useEffect(() => {
    apiCall('/health').then(setHealth).catch(() => setHealth({ status: 'error', scheduler_running: false }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-50 gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shadow-lg">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">TechDrops Automator</h1>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
            <div className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-semibold text-slate-300">
              {health?.status === 'ok' ? 'Online' : 'Offline'}
            </span>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-medium">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
            <div className="space-y-2 flex flex-col sm:flex-row lg:flex-col gap-2 sm:gap-4 lg:gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                  activeTab === 'overview' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                  activeTab === 'schedule' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Schedule Emails</span>
              </button>
              
              <button
                onClick={() => setActiveTab('auto')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                  activeTab === 'auto' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="font-medium">Auto Scheduler</span>
              </button>

              <button
                onClick={() => setActiveTab('master')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                  activeTab === 'master' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-5 h-5" />
                <span className="font-medium">Master Scheduler</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('domains')} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${activeTab === 'domains' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-800'}`}
              >
                <Globe className="w-5 h-5" /><span className="font-medium">Domains</span>
              </button>

              <button
                onClick={() => setActiveTab('extract')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                  activeTab === 'extract' ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span className="font-medium">Extract Emails</span>
              </button>
            </div>
            
            <div className="mt-4 sm:mt-0 lg:mt-6 p-5 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 hidden sm:block">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">System Health</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${health?.status === 'ok' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {health?.status === 'ok' ? 'OK' : 'ERR'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
              {activeTab === 'overview' ? <UserStats token={token} /> :
               activeTab === 'schedule' ? <ScheduleEmails token={token} /> : 
               activeTab === 'auto' ? <AutoScheduler token={token} /> :
               activeTab === 'master' ? <MasterScheduler token={token} /> :
               activeTab === 'domains' ? <DomainManager token={token} /> : 
               <ExtractEmails token={token} />
              }
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. User Stats & Logs (Updated to call GET /emails/usage)
const UserStats = ({ token }: { token: string }) => {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // States for selection and deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, type: 'single' | 'bulk' | 'all', id?: string } | null>(null);

  const fetchLogs = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await apiCall('/emails/logs', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to load logs", err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await apiCall('/emails/usage', { headers: { 'Authorization': `Bearer ${token}` } });
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLogs(true)]);
      setLoading(false);
    };
    initData();
  }, [token]);

  // --- DELETE HANDLERS ---

  const handleDeleteSingle = async (id: string) => {
    setIsDeleting(true);
    try {
      await apiCall(`/emails/logs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchLogs(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
      setConfirmModal(null);
    }
  };

  const handleDeleteBulk = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await apiCall('/emails/logs/bulk-delete', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ids: selectedIds })
      });
      setSelectedIds([]);
      await fetchLogs(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
      setConfirmModal(null);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await apiCall('/emails/logs/delete-all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchLogs(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
      setConfirmModal(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(logs.map(l => l._id));
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-white">Overview</h2><p className="text-slate-400">Your email usage statistics and recent activity.</p></div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2"><Activity className="w-5 h-5 text-blue-400" /><h3 className="font-semibold text-slate-300">Today's Usage</h3></div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-white">{stats.sent_today}</div>
              <div className="text-xs text-slate-500">Emails successfully sent today</div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-2"><TrendingUp className="w-5 h-5 text-green-400" /><h3 className="font-semibold text-slate-300">Monthly Progress</h3></div>
             <div className="mt-4">
                <div className="text-3xl font-bold text-white">{stats.sent_this_month}</div>
                <div className="text-xs text-slate-500">Total emails sent this month</div>
                <div className="mt-3 flex justify-between text-xs text-slate-400">
                  <span>Limit: {stats.monthly_limit === 0 ? 'Unlimited' : stats.monthly_limit}</span>
                  <span>Left: {stats.remaining === null ? 'Unlimited' : stats.remaining}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${stats.monthly_limit === 0 ? 0 : Math.min((stats.sent_this_month / stats.monthly_limit) * 100, 100)}%` }}
                  ></div>
                </div>
             </div>
          </div>

           <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-2"><BarChart3 className="w-5 h-5 text-amber-400" /><h3 className="font-semibold text-slate-300">Remaining Quota</h3></div>
             <div className="mt-4 text-center">
                <div className="bg-slate-800/50 rounded-xl p-4">
                   <div className="text-2xl font-bold text-amber-400">{stats.remaining === null ? '∞' : stats.remaining}</div>
                   <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Available Emails</div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* EMAIL LOGS SECTION WITH DELETE ACTIONS */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
           <div className="flex items-center gap-2">
             <History className="w-4 h-4 text-slate-400" />
             <h3 className="font-semibold text-white">Recent Email Logs</h3>
           </div>
           
           <div className="flex items-center gap-2">
             {selectedIds.length > 0 && (
               <button 
                onClick={() => setConfirmModal({ show: true, type: 'bulk' })}
                className="flex items-center gap-2 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-all"
               >
                 <Trash2 className="w-3 h-3" />
                 Delete Selected ({selectedIds.length})
               </button>
             )}
             
             {logs.length > 0 && (
               <button 
                 onClick={() => setConfirmModal({ show: true, type: 'all' })}
                 className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
               >
                 Delete All History
               </button>
             )}

             <button 
               onClick={() => { fetchLogs(); fetchStats(); }}
               disabled={refreshing}
               className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium transition-colors"
             >
               <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
               Refresh
             </button>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
             <thead className="bg-slate-900 text-slate-200 uppercase font-medium text-[10px] tracking-wider">
               <tr>
                 <th className="px-6 py-4 w-10">
                   <input 
                     type="checkbox" 
                     className="accent-blue-500 rounded" 
                     checked={logs.length > 0 && selectedIds.length === logs.length}
                     onChange={toggleSelectAll}
                   />
                 </th>
                 <th className="px-6 py-4">Receiver Email</th>
                 <th className="px-6 py-4">Status</th>
                 <th className="px-6 py-4 text-center">Scheduled / Executed</th>
                 <th className="px-6 py-4 text-right">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800">
               {logs.length === 0 ? (
                 <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No email logs available.</td></tr>
               ) : logs.map((log) => (
                 <tr key={log._id} className={`hover:bg-slate-800/30 transition-colors group ${selectedIds.includes(log._id) ? 'bg-blue-500/5' : ''}`}>
                   <td className="px-6 py-4">
                     <input 
                       type="checkbox" 
                       className="accent-blue-500 rounded"
                       checked={selectedIds.includes(log._id)}
                       onChange={() => toggleSelect(log._id)}
                     />
                   </td>
                   <td className="px-6 py-4 font-medium text-slate-300 group-hover:text-white transition-colors">{log.receiverMail}</td>
                   <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${
                          log.status === 'sent' ? 'bg-green-500/20 text-green-400' : 
                          log.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {log.status}
                        </span>
                        {log.status === 'failed' && log.error && (
                          <span className="text-[10px] text-red-400 mt-1 max-w-[180px] truncate" title={log.error}>
                            {log.error}
                          </span>
                        )}
                      </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-[11px] text-slate-500 font-mono text-center">
                     <div>{new Date(log.scheduled_at).toLocaleString()}</div>
                     <div className="text-slate-600 mt-0.5">{log.executed_at ? new Date(log.executed_at).toLocaleString() : 'Not Executed'}</div>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setConfirmModal({ show: true, type: 'single', id: log._id })}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal?.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-2">Are you sure?</h3>
            <p className="text-slate-400 text-sm text-center mb-6">
              {confirmModal.type === 'single' && "This email log will be permanently deleted."}
              {confirmModal.type === 'bulk' && `You are about to delete ${selectedIds.length} selected logs.`}
              {confirmModal.type === 'all' && "This will wipe your entire email history. This action cannot be undone."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                disabled={isDeleting}
                onClick={() => {
                  if (confirmModal.type === 'single' && confirmModal.id) handleDeleteSingle(confirmModal.id);
                  else if (confirmModal.type === 'bulk') handleDeleteBulk();
                  else if (confirmModal.type === 'all') handleDeleteAll();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 5. Domain Manager Module
const DomainManager = ({ token }: { token: string }) => {
  const [domains, setDomains] = useState<DomainListItem[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState<string | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<DomainVerificationResponse | null>(null);
  const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const data = await apiCall('/domains', { headers: { 'Authorization': `Bearer ${token}` } });
      setDomains(data.domains || []);
    } catch (err) { console.error("Failed to fetch domains", err); }
  };

  const handleRequestVerification = async () => {
    if (!newEmail) return;

    // Frontend Blocklist Validation
    const blockedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com'];
    const emailParts = newEmail.split('@');
    if (emailParts.length < 2) {
      setMsg({ type: 'error', text: 'Invalid email format' });
      return;
    }
    const emailDomain = emailParts[1];

    if (blockedDomains.includes(emailDomain.toLowerCase())) {
       setMsg({ type: 'error', text: 'Public email domains (Gmail, Yahoo, etc.) cannot be verified. Please use a custom domain you own.' });
       return;
    }

    setLoading(true); setMsg(null); setVerificationData(null);
    try {
      const data = await apiCall('/domains/request-verification', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sender_email: newEmail })
      });
      setVerificationData(data);
      if (data.status === 'verified') {
        setMsg({ type: 'success', text: 'Domain already verified!' });
        fetchDomains();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (domain: string) => {
    setCheckingDomain(domain);
    try {
       const data = await apiCall(`/domains/check-status?domain=${domain}`, {
         headers: { 'Authorization': `Bearer ${token}` }
       });
       if (data.status === 'verified') {
         alert(`Domain ${domain} is now Verified!`);
         fetchDomains(); // Refresh list to update status badge
         if (verificationData?.domain === domain) setVerificationData(null); 
       } else {
         alert(`Domain ${domain} is still Pending verification.`);
       }
    } catch (err: any) {
      alert(`Error checking status: ${err.message}`);
    } finally {
      setCheckingDomain(null);
    }
  };

  const handleDeleteDomain = async (domain: string) => {
    if (!window.confirm(`Are you sure you want to delete the verification request for ${domain}? This cannot be undone.`)) return;
    
    setDeletingDomain(domain);
    try {
      await apiCall('/domains', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ domain })
      });
      setMsg({ type: 'success', text: `Domain ${domain} removed successfully` });
      fetchDomains(); // Refresh list
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`); 
    } finally {
      setDeletingDomain(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-white">Domain Management</h2><p className="text-slate-400">Manage custom sender domains and verification.</p></div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">Request Verification</h3>
        <div className="flex gap-3">
          <input 
            placeholder="Enter sender email (e.g. no-reply@example.com)" 
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button onClick={handleRequestVerification} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
          </button>
        </div>
        {msg && <div className={`mt-3 text-sm ${msg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</div>}
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-400">
           <thead className="bg-slate-900 text-slate-200 uppercase font-medium">
             <tr>
               <th className="px-6 py-4">Domain</th>
               <th className="px-6 py-4">Status</th>
               <th className="px-6 py-4 text-right">Action</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-800">
             {domains.length === 0 ? (
               <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No domains found.</td></tr>
             ) : domains.map((d, i) => (
               <tr key={i} className="hover:bg-slate-800/30">
                 <td className="px-6 py-4 font-medium text-white">{d.domain}</td>
                 <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${d.status === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {d.status}
                    </span>
                 </td>
                 <td className="px-6 py-4 text-right">
                   <div className="flex justify-end gap-3 items-center">
                   {(d.status === 'pending' || d.status === 'verification_required') && (
                     <>
                        <button 
                          type="button"
                          disabled={checkingDomain === d.domain}
                          onClick={() => checkStatus(d.domain)} 
                          className="text-blue-400 hover:text-white text-xs flex items-center gap-1 disabled:opacity-50"
                        >
                          {checkingDomain === d.domain ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Check
                        </button>
                        <button 
                          type="button"
                          disabled={deletingDomain === d.domain}
                          onClick={() => handleDeleteDomain(d.domain)} 
                          className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 disabled:opacity-50"
                        >
                          {deletingDomain === d.domain ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
                        </button>
                     </>
                   )}
                   </div>
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>

      {verificationData && verificationData.status === 'verification_required' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">DNS Verification Required</h3>
              <button onClick={() => setVerificationData(null)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            
            <p className="text-slate-400 mb-4 text-sm">Please add the following DNS records to your domain provider for <b>{verificationData.domain}</b>.</p>
            
            <div className="space-y-6">
              {verificationData.dns_records?.txt && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">TXT Record</h4>
                  <div className="bg-black/50 border border-slate-800 rounded-lg p-3 grid grid-cols-12 gap-2 text-xs font-mono">
                    <div className="col-span-4 break-all text-slate-300">{verificationData.dns_records.txt.name}</div>
                    <div className="col-span-7 break-all text-blue-300">{verificationData.dns_records.txt.value}</div>
                    <div className="col-span-1 text-right">
                       <button onClick={() => navigator.clipboard.writeText(verificationData.dns_records!.txt.value)} className="text-slate-500 hover:text-white"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )}

              {verificationData.dns_records?.dkim && verificationData.dns_records.dkim.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">CNAME Records (DKIM)</h4>
                  {verificationData.dns_records.dkim.map((rec, idx) => (
                    <div key={idx} className="bg-black/50 border border-slate-800 rounded-lg p-3 grid grid-cols-12 gap-2 text-xs font-mono mb-2">
                      <div className="col-span-4 break-all text-slate-300">{rec.name}</div>
                      <div className="col-span-7 break-all text-purple-300">{rec.value}</div>
                      <div className="col-span-1 text-right">
                          <button onClick={() => navigator.clipboard.writeText(rec.value)} className="text-slate-500 hover:text-white"><Copy className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setVerificationData(null)} className="px-4 py-2 text-slate-400 hover:text-white">Close</button>
              <button onClick={() => checkStatus(verificationData.domain)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">I've Added Records, Verify Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 6. Schedule Emails Module
const ScheduleEmails = ({ token }: { token: string }) => {
  const [senders, setSenders] = useState<Sender[]>([{ email: '', password: '' }]);
  const [savedSenders, setSavedSenders] = useState<Sender[]>([]);
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [receivers, setReceivers] = useState<Receiver[]>([{ receiverMail: '', receiverDomain: '', receiverName: '', scheduledDateTime: '' }]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [currentTemplate, setCurrentTemplate] = useState({ subject: '', body: '', name: '' });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isManageSendersOpen, setIsManageSendersOpen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedTemplates = localStorage.getItem('emailTemplates');
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    const savedSenderProfiles = localStorage.getItem('savedSenders');
    if (savedSenderProfiles) setSavedSenders(JSON.parse(savedSenderProfiles));
  }, []);

  const saveTemplate = () => {
    if (!currentTemplate.name) return alert('Please name your template');
    const newTemplate: Template = { id: Date.now().toString(), name: currentTemplate.name, subject: currentTemplate.subject, body: currentTemplate.body };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem('emailTemplates', JSON.stringify(updated));
    setSelectedTemplateId(newTemplate.id);
    setIsTemplateModalOpen(false);
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('emailTemplates', JSON.stringify(updated));
    if (selectedTemplateId === id) {
      setSelectedTemplateId('');
      setCurrentTemplate({ name: '', subject: '', body: '' });
    }
  };

  const loadTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const found = templates.find(t => t.id === id);
    if (found) setCurrentTemplate({ name: found.name, subject: found.subject, body: found.body });
  };

  const saveSenderProfile = (sender: Sender) => {
    if (!sender.email) return alert("Enter email");
    // Only require password for gmail if user enters one
    const existingIndex = savedSenders.findIndex(s => s.email === sender.email);
    let updatedList = existingIndex >= 0 ? [...savedSenders] : [...savedSenders, sender];
    if (existingIndex >= 0) updatedList[existingIndex] = sender;
    setSavedSenders(updatedList);
    localStorage.setItem('savedSenders', JSON.stringify(updatedList));
  };

  const deleteSavedSender = (email: string) => {
    const updatedList = savedSenders.filter(s => s.email !== email);
    setSavedSenders(updatedList);
    localStorage.setItem('savedSenders', JSON.stringify(updatedList));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const insertTag = (tagStart: string, tagEnd: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    const newText = before + tagStart + selection + tagEnd + after;
    setCurrentTemplate({ ...currentTemplate, body: newText });
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagStart.length, end + tagStart.length);
    }, 0);
  };

  const handleSubmit = async () => {
    setLoading(true); setResponseMsg(null);
    try {
      if (!currentTemplate.subject || !currentTemplate.body) throw new Error("Template required.");

      const formattedSenders = senders.map(s => ({
        senderMail: s.email,
        smtp_password: s.password || "" 
      }));

      const payload: any = {
        senders: formattedSenders,
        template: { 
          subject: currentTemplate.subject, 
          body: `<html><body>${currentTemplate.body.replace(/\n/g, '<br/>')}</body></html>` 
        }
      };

      if (mode === 'manual') {
        payload.receivers = receivers
          .filter(r => r.receiverMail && r.scheduledDateTime)
          .map(r => ({
            receiverMail: r.receiverMail,
            receiverDomain: r.receiverDomain || "",
            receiverName: r.receiverName || "",
            scheduledDateTime: r.scheduledDateTime.replace('T', ' ').substring(0, 16)
          }));
        if (payload.receivers.length === 0) throw new Error("Please add at least one valid receiver with a date.");
      } else {
        if (!csvFile) throw new Error("Please upload a CSV file.");
        payload.receivers_csv_base64 = await fileToBase64(csvFile);
      }

      const data = await apiCall('/scheduleEmails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      setResponseMsg({ 
        type: 'success', 
        text: `${data.message || 'Success!'} ${data.scheduled_count !== undefined ? `(${data.scheduled_count} scheduled)` : ''}` 
      });

    } catch (err: any) {
      setResponseMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-white">Schedule Campaign</h2><p className="text-slate-400 mt-1">Configure your email blast parameters below.</p></div>
        <button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />} Start Campaign
        </button>
      </div>
      {responseMsg && <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${responseMsg.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>{responseMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}<span className="font-medium">{responseMsg.text}</span></div>}

      <div className="space-y-6">
        {/* 1. Senders Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white flex items-center gap-2"><div className="p-1.5 bg-blue-500/20 rounded text-blue-400"><Users className="w-4 h-4" /></div> Senders</h3>
            <div className="flex items-center gap-2">
              {savedSenders.length > 0 && <button onClick={() => setIsManageSendersOpen(true)} className="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700" title="Manage Saved Senders"><Settings className="w-4 h-4" /></button>}
              <button onClick={() => setSenders([...senders, { email: '', password: '' }])} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-500/20 transition-colors"><Plus className="w-3 h-3" /> Add Sender</button>
            </div>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {senders.map((sender, idx) => {
              const emailParts = sender.email.split('@');
              const domain = emailParts.length > 1 ? emailParts[1].toLowerCase() : '';
              const isPublic = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com'].includes(domain);
              
              return (
              <div key={idx} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-3 group hover:border-slate-600 transition-colors">
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-mono font-medium">ACCOUNT #{idx + 1}</span>{savedSenders.length > 0 && (<select className="bg-slate-900 border border-slate-700 text-xs text-blue-300 rounded-lg px-2 py-1 max-w-[150px] outline-none focus:border-blue-500 cursor-pointer" onChange={(e) => { const selected = savedSenders.find(s => s.email === e.target.value); if (selected) { const newSenders = [...senders]; newSenders[idx] = { ...selected }; setSenders(newSenders); }}} value=""><option value="" disabled>Load Saved...</option>{savedSenders.map(s => <option key={s.email} value={s.email}>{s.email}</option>)}</select>)}</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input placeholder="Sender Email" className="w-full sm:flex-1 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" value={sender.email} onChange={e => { const newSenders = [...senders]; newSenders[idx].email = e.target.value; setSenders(newSenders); }} />
                  {isPublic ? (
                    <input type="password" placeholder="App Password" className="w-full sm:flex-1 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" value={sender.password} onChange={e => { const newSenders = [...senders]; newSenders[idx].password = e.target.value; setSenders(newSenders); }} />
                  ) : (
                    <div className="w-full sm:flex-1 bg-slate-900/30 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-500 italic flex items-center"><Shield className="w-3 h-3 mr-2" /> Managed via Domain</div>
                  )}
                  <div className="flex gap-2 justify-end sm:justify-start">
                    <button onClick={() => saveSenderProfile(sender)} className="p-2 text-slate-400 hover:text-blue-400 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors" title="Save Profile"><Save className="w-4 h-4" /></button>
                    {senders.length > 1 && <button onClick={() => setSenders(senders.filter((_, i) => i !== idx))} className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors" title="Remove Row"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* 2. Receivers Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h3 className="font-semibold text-white flex items-center gap-2"><div className="p-1.5 bg-green-500/20 rounded text-green-400"><Users className="w-4 h-4" /></div> Receivers</h3>
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 w-full sm:w-auto"><button onClick={() => setMode('manual')} className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'manual' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'}`}>Manual</button><button onClick={() => setMode('csv')} className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'csv' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'}`}>CSV Upload</button></div>
          </div>
          {mode === 'manual' ? (
            <div className="space-y-3">
                {receivers.map((rec, idx) => (
                <div key={idx} className="flex flex-col xl:flex-row gap-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-3 xl:space-y-0 hover:border-slate-600 transition-all items-start xl:items-center">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 w-full">
                    <div className="relative"><span className="absolute -top-2 left-2 text-[10px] bg-slate-800 px-1 text-slate-500 font-semibold uppercase">Name</span><input placeholder="Name" className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" value={rec.receiverName} onChange={e => { const list = [...receivers]; list[idx].receiverName = e.target.value; setReceivers(list); }} /></div>
                    <div className="relative"><span className="absolute -top-2 left-2 text-[10px] bg-slate-800 px-1 text-slate-500 font-semibold uppercase">Domain</span><input placeholder="Domain" className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" value={rec.receiverDomain} onChange={e => { const list = [...receivers]; list[idx].receiverDomain = e.target.value; setReceivers(list); }} /></div>
                    <div className="relative xl:col-span-2"><span className="absolute -top-2 left-2 text-[10px] bg-slate-800 px-1 text-slate-500 font-semibold uppercase">Email</span><input placeholder="Receiver Email" className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" value={rec.receiverMail} onChange={e => { const list = [...receivers]; list[idx].receiverMail = e.target.value; setReceivers(list); }} /></div>
                  </div>
                  <div className="flex gap-2 w-full xl:w-auto items-center mt-2 xl:mt-0">
                    <div className="relative flex-1 xl:flex-none"><span className="absolute -top-2 left-2 text-[10px] bg-slate-800 px-1 text-slate-500 font-semibold uppercase">Schedule</span><input type="datetime-local" className="w-full xl:w-auto bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white focus:border-blue-500 outline-none" value={rec.scheduledDateTime} onChange={e => { const list = [...receivers]; list[idx].scheduledDateTime = e.target.value; setReceivers(list); }} /></div>
                    {receivers.length > 1 && <button onClick={() => setReceivers(receivers.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-400 p-2 hover:bg-slate-800 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
              <button onClick={() => setReceivers([...receivers, { receiverMail: '', receiverDomain: '', receiverName: '', scheduledDateTime: '' }])} className="w-full py-4 border border-dashed border-slate-700 bg-slate-800/20 text-slate-400 hover:text-blue-400 rounded-xl transition-all text-sm flex items-center justify-center gap-2 group hover:bg-slate-800/40"><Plus className="w-4 h-4 group-hover:scale-110" /> Add Another Receiver</button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-10 text-center hover:border-blue-500 hover:bg-slate-800/30 transition-all bg-slate-800/20 group cursor-pointer relative">
              <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="bg-slate-800 p-4 rounded-full inline-flex mb-4 group-hover:scale-110 shadow-lg"><Upload className="w-8 h-8 text-blue-500" /></div>
              <p className="text-lg font-medium text-white mb-2">{csvFile ? <span className="text-green-400">{csvFile.name}</span> : "Drop CSV file here"}</p>
              <p className="text-xs text-slate-500 font-mono">Headers: receiverMail, receiverDomain, receiverName, scheduledDateTime</p>
            </div>
          )}
        </div>

        {/* 3. Template Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white flex items-center gap-2"><div className="p-1.5 bg-amber-500/20 rounded text-amber-400"><FileText className="w-4 h-4" /></div> Email Content</h3>
            <div className="flex gap-2">
              <select value={selectedTemplateId} onChange={(e) => loadTemplate(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 cursor-pointer max-w-[120px] sm:max-w-none"><option value="">Select Saved Template...</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <button onClick={() => setIsTemplateModalOpen(true)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors"><Save className="w-4 h-4" /></button>
              {selectedTemplateId && <button onClick={() => deleteTemplate(selectedTemplateId)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
          <div className="space-y-4 flex-1 flex flex-col">
            <input placeholder="Email Subject Line" value={currentTemplate.subject} onChange={(e) => setCurrentTemplate({...currentTemplate, subject: e.target.value})} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-blue-500 outline-none font-medium text-lg transition-all" />
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-[350px]">
              <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-900/50">
                 <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => insertTag('<b>', '</b>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Bold"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => insertTag('<i>', '</i>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Italic"><Italic className="w-4 h-4" /></button>
                    <button onClick={() => insertTag('<u>', '</u>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Underline"><Underline className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                    <button onClick={() => insertTag('<h1>', '</h1>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 font-bold text-xs" title="Heading 1">H1</button>
                    <button onClick={() => insertTag('<h2>', '</h2>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 font-bold text-xs" title="Heading 2">H2</button>
                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                    <button onClick={() => insertTag('<a href="">', '</a>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Link"><LinkIcon className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                    <button onClick={() => insertTag('{receiver_name}')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px] font-mono" title="Receiver Name">{`{name}`}</button>
                    <button onClick={() => insertTag('{sender_mail}')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px] font-mono" title="Sender Email">{`{sender}`}</button>
                    <button onClick={() => insertTag('{domain_name}')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px] font-mono" title="Domain Name">{`{domain}`}</button>
                 </div>
                 <button onClick={() => setIsPreview(!isPreview)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${isPreview ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}>{isPreview ? <><EyeOff className="w-3 h-3" /> Edit</> : <><Eye className="w-3 h-3" /> Preview</>}</button>
              </div>
              {isPreview ? (
                <div className="w-full h-full bg-white text-black p-5 overflow-y-auto prose prose-sm max-w-none">{currentTemplate.body ? (<div dangerouslySetInnerHTML={{ __html: currentTemplate.body.replace(/\n/g, '<br/>') }} />) : (<span className="text-gray-400 italic">Preview empty...</span>)}</div>
              ) : (
                <textarea ref={textareaRef} placeholder="Compose your email body here...&#10;&#10;Use {receiver_name}, {domain_name}, {sender_mail} as placeholders.&#10;HTML tags are supported." value={currentTemplate.body} onChange={(e) => setCurrentTemplate({...currentTemplate, body: e.target.value})} className="w-full h-full bg-slate-900/80 p-5 text-white focus:outline-none resize-none font-mono text-sm" />
              )}
            </div>
          </div>
        </div>
      </div>
      {isManageSendersOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white">Manage Saved Senders</h3><button onClick={() => setIsManageSendersOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button></div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">{savedSenders.length === 0 ? <p className="text-slate-500 text-center py-4">No saved profiles yet.</p> : savedSenders.map((s, i) => (<div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors"><div className="overflow-hidden"><p className="text-white text-sm truncate">{s.email}</p><p className="text-slate-500 text-xs">********</p></div><button onClick={() => deleteSavedSender(s.email)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></div>))}</div>
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end"><button onClick={() => setIsManageSendersOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors">Close</button></div>
          </div>
        </div>
      )}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Save Template</h3>
            <input placeholder="e.g., Monthly Newsletter" value={currentTemplate.name} onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white mb-4" />
            <div className="flex justify-end gap-3"><button onClick={() => setIsTemplateModalOpen(false)} className="px-5 py-2.5 text-slate-300">Cancel</button><button onClick={saveTemplate} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

// 7. Auto Scheduler Module
const AutoScheduler = ({ token }: { token: string }) => {
  const [mode, setMode] = useState<'manual' | 'receiver_csv' | 'full_csv'>('manual');
  const [startDateTime, setStartDateTime] = useState('');
  const [gapMinutes, setGapMinutes] = useState(5);
  const [sender, setSender] = useState({ email: '', password: '' });
  const [savedSenders, setSavedSenders] = useState<Sender[]>([]);
  const [receivers, setReceivers] = useState<Array<{receiverMail: string, receiverDomain: string, receiverName: string}>>([{ receiverMail: '', receiverDomain: '', receiverName: '' }]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [template, setTemplate] = useState({ subject: '', body: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoScheduleSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('emailTemplates');
    if (saved) setTemplates(JSON.parse(saved));
    const savedProfiles = localStorage.getItem('savedSenders');
    if (savedProfiles) setSavedSenders(JSON.parse(savedProfiles));
  }, []);

  const saveTemplate = () => {
    if (!template.name) return alert('Please name your template');
    const newTemplate: Template = { id: Date.now().toString(), name: template.name, subject: template.subject, body: template.body };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem('emailTemplates', JSON.stringify(updated));
    setSelectedTemplateId(newTemplate.id);
    setIsTemplateModalOpen(false);
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('emailTemplates', JSON.stringify(updated));
    if (selectedTemplateId === id) {
      setSelectedTemplateId('');
      setTemplate({ name: '', subject: '', body: '' });
    }
  };

  const loadTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const found = templates.find(t => t.id === id);
    if (found) setTemplate({ name: found.name, subject: found.subject, body: found.body });
  };

  const saveSenderProfile = (sender: {email: string, password?: string}) => {
    if (!sender.email) return alert("Enter email");
    const existingIndex = savedSenders.findIndex(s => s.email === sender.email);
    let updatedList = existingIndex >= 0 ? [...savedSenders] : [...savedSenders, sender];
    if (existingIndex >= 0) updatedList[existingIndex] = sender;
    setSavedSenders(updatedList);
    localStorage.setItem('savedSenders', JSON.stringify(updatedList));
  };

  const insertTag = (tagStart: string, tagEnd: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    const newText = before + tagStart + selection + tagEnd + after;
    setTemplate({ ...template, body: newText });
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagStart.length, end + tagStart.length);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!startDateTime) return setError("Start Date & Time is required");
    if (gapMinutes < 1 || gapMinutes > 60) return setError("Gap Minutes must be between 1 and 60");
    setLoading(true); setError(null); setResult(null);

    try {
      const payload: any = {
        startDateTime: startDateTime.replace('T', ' ').substring(0, 16),
        gapMinutes: Number(gapMinutes),
        template: {
          subject: template.subject,
          body: `<html><body>${template.body.replace(/\n/g, '<br/>')}</body></html>`
        }
      };

      if (mode === 'manual') {
        payload.sender = { senderMail: sender.email, smtp_password: sender.password };
        payload.receivers = receivers.filter(r => r.receiverMail);
      } else if (mode === 'receiver_csv') {
        if (!csvFile) throw new Error("Please upload receivers CSV");
        payload.sender = { senderMail: sender.email, smtp_password: sender.password };
        payload.receivers_csv_base64 = await fileToBase64(csvFile);
      } else {
        if (!csvFile) throw new Error("Please upload full CSV");
        payload.csv_base64 = await fileToBase64(csvFile);
      }

      const data = await apiCall('/scheduleEmails/auto', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-white">Auto Scheduler</h2><p className="text-slate-400 mt-1">Configure drip campaigns with fixed time intervals.</p></div>
        <button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />} Start Auto Schedule
        </button>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm font-medium">{error}</p></div>}

      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 shadow-2xl">
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h3 className="text-lg font-bold text-white flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" /> Auto Scheduling Result</h3>
               <p className="text-slate-500 text-sm mt-1">Start: {new Date(result.startDateTime).toLocaleString()} • Gap: {result.gapMinutes} mins</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center"><div className="text-xl font-bold text-green-400">{result.scheduled}</div><div className="text-[10px] text-slate-500 uppercase">Scheduled</div></div>
              <div className="text-center"><div className="text-xl font-bold text-red-400">{result.failed}</div><div className="text-[10px] text-slate-500 uppercase">Failed</div></div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="p-4 bg-red-950/20 divide-y divide-red-900/30">
              {result.errors.map((err, i) => (
                <div key={i} className="text-xs text-red-300 py-2">
                  {err.row && <span className="font-bold mr-2">Row {err.row}:</span>}
                  {err.email && <span className="italic mr-2">{err.email} -</span>}
                  {err.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Timing Config Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm">
           <h3 className="font-semibold text-white mb-6 flex items-center gap-2"><div className="p-1.5 bg-blue-500/20 rounded text-blue-400"><Clock className="w-4 h-4" /></div> Interval Settings</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Start Date & Time (IST)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input type="datetime-local" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all" value={startDateTime} onChange={e => setStartDateTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Gap Minutes (1-60)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input type="number" min="1" max="60" className={`w-full bg-slate-900 border ${gapMinutes > 60 || gapMinutes < 1 ? 'border-red-500' : 'border-slate-700'} rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all`} value={gapMinutes} onChange={e => setGapMinutes(parseInt(e.target.value))} />
                </div>
                {gapMinutes > 60 && <p className="text-[10px] text-red-400 font-bold uppercase ml-1">Max Gap is 60 minutes</p>}
              </div>
           </div>
        </div>

        {/* Sender Card (Only for non-Full CSV) */}
        {mode !== 'full_csv' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white flex items-center gap-2"><div className="p-1.5 bg-indigo-500/20 rounded text-indigo-400"><Users className="w-4 h-4" /></div> Sender Account</h3>
              {savedSenders.length > 0 && (
                 <select className="bg-slate-900 border border-slate-700 text-xs text-blue-300 rounded-lg px-2 py-1 outline-none focus:border-blue-500 cursor-pointer" onChange={(e) => { const selected = savedSenders.find(s => s.email === e.target.value); if (selected) setSender({ email: selected.email, password: selected.password || '' }); }} value=""><option value="" disabled>Load Saved Account...</option>{savedSenders.map(s => <option key={s.email} value={s.email}>{s.email}</option>)}</select>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
               <div className="space-y-1 lg:col-span-5">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email Address</label>
                 <input placeholder="Sender Email" className="w-full bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all" value={sender.email} onChange={e => setSender({...sender, email: e.target.value})} />
               </div>
               <div className="space-y-1 lg:col-span-5">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">App Password</label>
                 <input type="password" placeholder="SMTP/App Password" className="w-full bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all" value={sender.password} onChange={e => setSender({...sender, password: e.target.value})} />
               </div>
               <div className="lg:col-span-2">
                 <button onClick={() => saveSenderProfile(sender)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-blue-400 rounded-xl flex items-center justify-center gap-2 transition-all"><Save className="w-4 h-4" /> Save</button>
               </div>
            </div>
          </div>
        )}

        {/* Receiver Card with Mode Selection */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h3 className="font-semibold text-white flex items-center gap-2"><div className="p-1.5 bg-green-500/20 rounded text-green-400"><Users className="w-4 h-4" /></div> Recipients</h3>
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
              <button onClick={() => setMode('manual')} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'manual' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'}`}>Manual</button>
              <button onClick={() => setMode('receiver_csv')} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'receiver_csv' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'}`}>Rec. CSV</button>
              <button onClick={() => setMode('full_csv')} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'full_csv' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'}`}>Full CSV</button>
            </div>
          </div>

          {mode === 'manual' ? (
            <div className="space-y-3">
              {receivers.map((r, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all items-center">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 w-full">
                     <div className="relative"><span className="absolute -top-2 left-2 text-[9px] bg-slate-800 px-1 text-slate-500 font-bold uppercase">Name</span><input placeholder="Receiver Name" className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" value={r.receiverName} onChange={e => { const list = [...receivers]; list[i].receiverName = e.target.value; setReceivers(list); }} /></div>
                     <div className="relative"><span className="absolute -top-2 left-2 text-[9px] bg-slate-800 px-1 text-slate-500 font-bold uppercase">Domain</span><input placeholder="e.g. company.com" className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" value={r.receiverDomain} onChange={e => { const list = [...receivers]; list[i].receiverDomain = e.target.value; setReceivers(list); }} /></div>
                     <div className="relative"><span className="absolute -top-2 left-2 text-[9px] bg-slate-800 px-1 text-slate-500 font-bold uppercase">Email</span><input placeholder="Receiver Email" className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" value={r.receiverMail} onChange={e => { const list = [...receivers]; list[i].receiverMail = e.target.value; setReceivers(list); }} /></div>
                  </div>
                  {receivers.length > 1 && <button onClick={() => setReceivers(receivers.filter((_, idx) => idx !== i))} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
              <button onClick={() => setReceivers([...receivers, {receiverMail: '', receiverDomain: '', receiverName: ''}])} className="w-full py-4 border border-dashed border-slate-700 bg-slate-800/20 text-slate-400 hover:text-blue-400 rounded-xl transition-all text-sm flex items-center justify-center gap-2 group hover:bg-slate-800/40"><Plus className="w-4 h-4 group-hover:scale-110" /> Add Another Receiver</button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-10 text-center hover:border-blue-500 hover:bg-slate-800/30 transition-all bg-slate-800/20 group cursor-pointer relative">
              <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="bg-slate-800 p-4 rounded-full inline-flex mb-4 group-hover:scale-110 shadow-lg"><Upload className="w-8 h-8 text-blue-500" /></div>
              <p className="text-lg font-medium text-white mb-2">{csvFile ? <span className="text-green-400">{csvFile.name}</span> : "Drop CSV file here"}</p>
              <p className="text-xs text-slate-500 font-mono">
                {mode === 'receiver_csv' ? 'Required: receiverMail, receiverDomain, receiverName' : 'Required: senderMail, password, receiverMail, receiverDomain, receiverName'}
              </p>
            </div>
          )}
        </div>

        {/* Template Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white flex items-center gap-2"><div className="p-1.5 bg-amber-500/20 rounded text-amber-400"><FileText className="w-4 h-4" /></div> Email Template</h3>
            <div className="flex gap-2">
              <select value={selectedTemplateId} onChange={(e) => loadTemplate(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 cursor-pointer max-w-[120px] sm:max-w-none"><option value="">Select Saved...</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <button onClick={() => setIsTemplateModalOpen(true)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors" title="Save Template"><Save className="w-4 h-4" /></button>
              {selectedTemplateId && <button onClick={() => deleteTemplate(selectedTemplateId)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors" title="Delete Template"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
          <div className="space-y-4 flex-1 flex flex-col">
            <input placeholder="Email Subject Line" value={template.subject} onChange={(e) => setTemplate({...template, subject: e.target.value})} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-blue-500 outline-none font-medium text-lg transition-all" />
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-[350px]">
              <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-900/50">
                 <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => insertTag('<b>', '</b>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Bold"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => insertTag('<i>', '</i>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Italic"><Italic className="w-4 h-4" /></button>
                    <button onClick={() => insertTag('<u>', '</u>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Underline"><Underline className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                    <button onClick={() => insertTag('<h1>', '</h1>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 font-bold text-xs" title="Heading 1">H1</button>
                    <button onClick={() => insertTag('<h2>', '</h2>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 font-bold text-xs" title="Heading 2">H2</button>
                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                    <button onClick={() => insertTag('<a href="">', '</a>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Link"><LinkIcon className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                    <button onClick={() => insertTag('{receiver_name}')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px] font-mono" title="Receiver Name">{`{name}`}</button>
                    <button onClick={() => insertTag('{sender_mail}')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px] font-mono" title="Sender Email">{`{sender}`}</button>
                    <button onClick={() => insertTag('{domain_name}')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px] font-mono" title="Domain Name">{`{domain}`}</button>
                 </div>
                 <button onClick={() => setIsPreview(!isPreview)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${isPreview ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}>{isPreview ? <><EyeOff className="w-3 h-3" /> Edit</> : <><Eye className="w-3 h-3" /> Preview</>}</button>
              </div>
              {isPreview ? (
                <div className="w-full h-full bg-white text-black p-5 overflow-y-auto prose prose-sm max-w-none">{template.body ? (<div dangerouslySetInnerHTML={{ __html: template.body.replace(/\n/g, '<br/>') }} />) : (<span className="text-gray-400 italic">Preview empty...</span>)}</div>
              ) : (
                <textarea ref={textareaRef} placeholder="Compose your email body here...&#10;&#10;Use {receiver_name}, {domain_name}, {sender_mail} as placeholders." value={template.body} onChange={(e) => setTemplate({...template, body: e.target.value})} className="w-full h-full bg-slate-900/80 p-5 text-white focus:outline-none resize-none font-mono text-sm" />
              )}
            </div>
          </div>
        </div>
      </div>

      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Save Template</h3>
            <input placeholder="e.g., Monthly Newsletter" value={template.name} onChange={(e) => setTemplate({...template, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white mb-4" />
            <div className="flex justify-end gap-3"><button onClick={() => setIsTemplateModalOpen(false)} className="px-5 py-2.5 text-slate-300 font-medium">Cancel</button><button onClick={saveTemplate} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

// 8. Extract Emails Module
const ExtractEmails = ({ token }: { token: string }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [domainCol, setDomainCol] = useState('domain');
  const [workers, setWorkers] = useState(20);
  const [loading, setLoading] = useState(false);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });

  const handleExtract = async () => {
    if (!csvFile) return setError("Please upload a CSV file.");
    setLoading(true); setError(null); setResultBase64(null);

    try {
      const payload = {
        csv_base64: await fileToBase64(csvFile),
        domain_col: domainCol,
        workers: workers
      };

      const data = await apiCall('/extractEmails', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      let base64 = typeof data === 'string' ? data : data.csv_base64;
      setResultBase64(base64);

    } catch (err: any) {
      if (err.message.includes("Access Expired")) {
         setError("Access Expired. Please contact admin.");
      } else {
         setError(err.message || "Extraction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    if (!resultBase64) return;
    const link = document.createElement("a");
    link.href = `data:text/csv;base64,${resultBase64}`;
    link.download = "extracted_emails.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8"><h2 className="text-3xl font-bold text-white mb-3">Domain Extractor</h2><p className="text-slate-400">Upload CSV of domains to scrape emails.</p></div>
      
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[400px]">
        <div className="space-y-8 relative z-10">
          <div className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-10 text-center bg-slate-800/20 relative">
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-5"><Upload className="w-8 h-8 text-slate-400" /></div>
            <p className="text-xl font-semibold text-white mb-2">{csvFile ? <span className="text-purple-400">{csvFile.name}</span> : "Drop CSV file here"}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider ml-1">Column Name</label><input value={domainCol} onChange={(e) => setDomainCol(e.target.value)} placeholder="e.g., domain" className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none" /></div>
            <div className="space-y-2">
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider ml-1">Workers</label>
              <input 
                type="number" 
                value={workers} 
                onChange={(e) => setWorkers(parseInt(e.target.value) || 0)} 
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none" 
              />
            </div>
          </div>
          <button onClick={handleExtract} disabled={loading || !csvFile} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />} Start Extraction
          </button>
          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm font-medium">{error}</p></div>}
          {resultBase64 && <div className="p-8 bg-green-500/5 border border-green-500/20 rounded-2xl text-center"><div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8" /></div><h3 className="text-white font-bold text-xl mb-2">Extraction Complete!</h3><button onClick={downloadResult} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2"><Download className="w-5 h-5" /> Download CSV</button></div>}
        </div>
      </div>
    </div>
  );
};

// 9. Master Scheduler Component
const MasterScheduler = ({ token }: { token: string }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [template, setTemplate] = useState({ subject: '', body: '', name: '' });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MasterScheduleSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedTemplates = localStorage.getItem('emailTemplates');
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
  }, []);

  const saveTemplate = () => {
    if (!template.name) return alert('Please name your template');
    const newTemplate: Template = { id: Date.now().toString(), name: template.name, subject: template.subject, body: template.body };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem('emailTemplates', JSON.stringify(updated));
    setSelectedTemplateId(newTemplate.id);
    setIsTemplateModalOpen(false);
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('emailTemplates', JSON.stringify(updated));
    if (selectedTemplateId === id) {
      setSelectedTemplateId('');
      setTemplate({ name: '', subject: '', body: '' });
    }
  };

  const loadTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const found = templates.find(t => t.id === id);
    if (found) setTemplate({ name: found.name, subject: found.subject, body: found.body });
  };

  const insertTag = (tagStart: string, tagEnd: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    const newText = before + tagStart + selection + tagEnd + after;
    setTemplate({ ...template, body: newText });
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagStart.length, end + tagStart.length);
    }, 0);
  };

  const handleSchedule = async () => {
    if (!csvFile) return setError("Please upload a CSV file.");
    if (!template.subject || !template.body) return setError("Please fill in subject and body.");
    
    setLoading(true); setError(null); setResult(null);

    try {
      const payload = {
        csv_base64: await fileToBase64(csvFile),
        template: {
          subject: template.subject,
          // Wrap body in proper HTML to ensure bolding works. 
          // Also convert newlines to <br> to preserve spacing in HTML mode.
          body: `<html><body>${template.body.replace(/\n/g, '<br/>')}</body></html>`
        }
      };

      const data = await apiCall('/scheduleEmails/master', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      setResult(data);

    } catch (err: any) {
      if (err.message.includes("Access Expired")) {
         setError("Access Expired. Please contact admin.");
      } else {
         setError(err.message || "Scheduling failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-white">Master Bulk Scheduler</h2><p className="text-slate-400 mt-1">Schedule multiple distinct jobs via CSV.</p></div>
        <button onClick={handleSchedule} disabled={loading} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95 transition-all">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />} Start Master Schedule
        </button>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm font-medium">{error}</p></div>}

      <div className="flex flex-col gap-6">
        {/* CSV Upload - Moved to Top */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
           <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><div className="p-1.5 bg-green-500/20 rounded text-green-400"><FileSpreadsheet className="w-4 h-4" /></div> Upload Job List</h3>
           <div className="flex-1 flex flex-col justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-800/20 relative transition-colors group">
              <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"><Upload className="w-6 h-6 text-slate-400" /></div>
              <p className="text-lg font-medium text-white mb-2">{csvFile ? <span className="text-indigo-400">{csvFile.name}</span> : "Drop CSV file here"}</p>
              <div className="text-xs text-slate-500 font-mono text-left bg-black/30 p-3 rounded-lg border border-slate-800 mt-4">
                <div className="font-bold text-slate-400 mb-1">REQUIRED HEADERS:</div>
                senderMail,password,receiverMail,receiverDomain,receiverName,scheduledDateTime
              </div>
           </div>
        </div>

        {/* Template Editor - Moved Below */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2"><div className="p-1.5 bg-amber-500/20 rounded text-amber-400"><FileText className="w-4 h-4" /></div> Master Template</h3>
            <div className="flex gap-2">
              <select value={selectedTemplateId} onChange={(e) => loadTemplate(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 cursor-pointer max-w-[120px] sm:max-w-none"><option value="">Select Saved Template...</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <button onClick={() => setIsTemplateModalOpen(true)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors"><Save className="w-4 h-4" /></button>
              {selectedTemplateId && <button onClick={() => deleteTemplate(selectedTemplateId)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
          <div className="space-y-4 flex-1 flex flex-col">
            <input placeholder="Email Subject Line" value={template.subject} onChange={(e) => setTemplate({...template, subject: e.target.value})} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none font-medium transition-all" />
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-[300px]">
              <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-900/50">
                 <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => insertTag('<b>', '</b>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Bold"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => insertTag('<i>', '</i>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Italic"><Italic className="w-4 h-4" /></button>
                    <button onClick={() => insertTag('<u>', '</u>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Underline"><Underline className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                    <button onClick={() => insertTag('<h1>', '</h1>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 font-bold text-xs" title="Heading 1">H1</button>
                    <button onClick={() => insertTag('<h2>', '</h2>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 font-bold text-xs" title="Heading 2">H2</button>
                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                    <button onClick={() => insertTag('<a href="">', '</a>')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="Link"><LinkIcon className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                    <button onClick={() => insertTag('{receiver_name}')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px] font-mono" title="Receiver Name">{`{name}`}</button>
                    <button onClick={() => insertTag('{sender_mail}')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px] font-mono" title="Sender Email">{`{sender}`}</button>
                    <button onClick={() => insertTag('{domain_name}')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px] font-mono" title="Domain Name">{`{domain}`}</button>
                 </div>
                 <button onClick={() => setIsPreview(!isPreview)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${isPreview ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}>{isPreview ? <><EyeOff className="w-3 h-3" /> Edit</> : <><Eye className="w-3 h-3" /> Preview</>}</button>
              </div>
              {isPreview ? (
                <div className="w-full h-full bg-white text-black p-5 overflow-y-auto prose prose-sm max-w-none">{template.body ? (<div dangerouslySetInnerHTML={{ __html: template.body.replace(/\n/g, '<br/>') }} />) : (<span className="text-gray-400 italic">Preview empty...</span>)}</div>
              ) : (
                <textarea ref={textareaRef} placeholder="Body content..." value={template.body} onChange={(e) => setTemplate({...template, body: e.target.value})} className="w-full h-full bg-slate-900/80 p-5 text-white focus:outline-none resize-none font-mono text-sm" />
              )}
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-slate-800 bg-slate-900/50">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" /> Scheduling Complete</h3>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-slate-800 rounded-xl text-center"><div className="text-2xl font-bold text-white">{result.summary.total_rows}</div><div className="text-xs text-slate-500 uppercase">Total Rows</div></div>
              <div className="p-3 bg-green-900/20 border border-green-900/50 rounded-xl text-center"><div className="text-2xl font-bold text-green-400">{result.summary.scheduled}</div><div className="text-xs text-green-600 uppercase">Scheduled</div></div>
              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-xl text-center"><div className="text-2xl font-bold text-red-400">{result.summary.failed}</div><div className="text-xs text-red-600 uppercase">Failed</div></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
             {/* Success List */}
             <div className="p-0">
               <div className="p-3 bg-green-900/10 text-xs font-bold text-green-400 uppercase border-b border-slate-800 text-center">Scheduled Jobs</div>
               <div className="max-h-64 overflow-y-auto">
                 {result.scheduled_jobs.length === 0 ? <p className="p-4 text-center text-slate-500 text-sm">No jobs scheduled.</p> : 
                   result.scheduled_jobs.map((job, i) => (
                     <div key={i} className="p-3 border-b border-slate-800/50 hover:bg-slate-800/20">
                       <div className="flex justify-between text-xs mb-1"><span className="text-slate-500 font-mono">Row {job.row}</span><span className="text-green-400">{job.scheduledDateTime}</span></div>
                       <div className="text-sm text-white truncate"><span className="text-slate-500">From:</span> {job.senderMail}</div>
                       <div className="text-sm text-white truncate"><span className="text-slate-500">To:</span> {job.receiverMail}</div>
                     </div>
                   ))
                 }
               </div>
             </div>
             
             {/* Error List */}
             <div className="p-0">
               <div className="p-3 bg-red-900/10 text-xs font-bold text-red-400 uppercase border-b border-slate-800 text-center">Failed Rows</div>
               <div className="max-h-64 overflow-y-auto">
                 {result.errors.length === 0 ? <p className="p-4 text-center text-slate-500 text-sm">No errors found.</p> : 
                   result.errors.map((err, i) => (
                     <div key={i} className="p-3 border-b border-slate-800/50 hover:bg-red-900/10">
                       <div className="flex justify-between text-xs mb-1"><span className="text-slate-500 font-mono">Row {err.row}</span><span className="text-red-400 font-bold">Failed</span></div>
                       <div className="text-sm text-white truncate"><span className="text-slate-500">Sender:</span> {err.senderMail}</div>
                       <div className="text-xs text-red-300 mt-1 bg-red-900/20 p-1.5 rounded">{err.error}</div>
                     </div>
                   ))
                 }
               </div>
             </div>
          </div>
        </div>
      )}

      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Save Template</h3>
            <input placeholder="e.g., Monthly Newsletter" value={template.name} onChange={(e) => setTemplate({...template, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white mb-4" />
            <div className="flex justify-end gap-3"><button onClick={() => setIsTemplateModalOpen(false)} className="px-5 py-2.5 text-slate-300">Cancel</button><button onClick={saveTemplate} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

// 10. Main App Entry
const App = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogin = (newToken: string, adminStatus: boolean) => {
    setToken(newToken);
    setIsAdmin(adminStatus);
  };

  const handleLogout = () => {
    setToken(null);
    setIsAdmin(false);
  };

  if (!token) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return isAdmin 
    ? <AdminDashboard token={token} onLogout={handleLogout} /> 
    : <UserDashboard token={token} onLogout={handleLogout} />;
};

export default App;